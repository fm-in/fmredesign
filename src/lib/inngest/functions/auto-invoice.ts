/**
 * Inngest Functions: Auto Invoice Generation
 *
 * 1. autoInvoiceDailyCron — runs daily at 3:30 AM UTC (9 AM IST),
 *    finds clients with auto_invoice=true and billing_day=today,
 *    then sends an invoice/auto-generate event for each.
 *
 * 2. generateAutoInvoiceFn — processes a single client: creates invoice,
 *    optionally sends it, notifies admin.
 */

import { inngest } from '../client';

export const autoInvoiceDailyCron = inngest.createFunction(
  {
    id: 'auto-invoice-daily-cron',
    retries: 3,
  },
  { cron: '30 3 * * *' }, // 3:30 AM UTC = ~9:00 AM IST
  async ({ step }) => {
    // Step 1: Find all eligible clients
    const clients = await step.run('fetch-eligible-clients', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase');
      const supabase = getSupabaseAdmin();

      const today = new Date();
      const dayOfMonth = today.getDate();

      // Check if today is the last day of the month
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isLastDayOfMonth = tomorrow.getDate() === 1;

      // Fetch clients whose billing day matches today
      // OR clients set to "last day of month" (-1) when today IS the last day
      const { data: exactDayClients, error: err1 } = await supabase
        .from('clients')
        .select('id, name, email, phone, address, city, state, country, gst_number, auto_invoice_day, auto_invoice_send, auto_invoice_template, auto_invoice_currency, auto_invoice_tax_rate, auto_invoice_notes, auto_invoice_terms')
        .eq('auto_invoice', true)
        .eq('status', 'active')
        .eq('auto_invoice_day', dayOfMonth);

      if (err1) throw new Error(`Failed to fetch clients: ${err1.message}`);

      let lastDayClients: typeof exactDayClients = [];
      if (isLastDayOfMonth) {
        const { data, error: err2 } = await supabase
          .from('clients')
          .select('id, name, email, phone, address, city, state, country, gst_number, auto_invoice_day, auto_invoice_send, auto_invoice_template, auto_invoice_currency, auto_invoice_tax_rate, auto_invoice_notes, auto_invoice_terms')
          .eq('auto_invoice', true)
          .eq('status', 'active')
          .eq('auto_invoice_day', -1);

        if (err2) throw new Error(`Failed to fetch last-day clients: ${err2.message}`);
        lastDayClients = data || [];
      }

      // Also handle day 29/30/31 clients on shorter months:
      // If a client is set to day 31 but the month only has 30 days,
      // generate their invoice on the last day of that month
      let overflowClients: typeof exactDayClients = [];
      if (isLastDayOfMonth && dayOfMonth < 31) {
        const { data, error: err3 } = await supabase
          .from('clients')
          .select('id, name, email, phone, address, city, state, country, gst_number, auto_invoice_day, auto_invoice_send, auto_invoice_template, auto_invoice_currency, auto_invoice_tax_rate, auto_invoice_notes, auto_invoice_terms')
          .eq('auto_invoice', true)
          .eq('status', 'active')
          .gt('auto_invoice_day', dayOfMonth)
          .lte('auto_invoice_day', 31);

        if (err3) throw new Error(`Failed to fetch overflow clients: ${err3.message}`);
        overflowClients = data || [];
      }

      // Deduplicate by client ID
      const allClients = [...(exactDayClients || []), ...lastDayClients, ...overflowClients];
      const seen = new Set<string>();
      return allClients.filter(c => {
        const id = c.id as string;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    });

    if (clients.length === 0) {
      return { message: 'No clients due for auto-invoice today', count: 0 };
    }

    // Step 2: Fan out — send an event per client for durable per-client processing
    await step.run('dispatch-invoice-events', async () => {
      const events = clients.map((client: Record<string, unknown>) => ({
        name: 'invoice/auto-generate' as const,
        data: {
          clientId: client.id as string,
          clientName: client.name as string,
          clientEmail: (client.email as string) || '',
          billingDay: client.auto_invoice_day as number,
          autoSend: !!client.auto_invoice_send,
          lineItems: ((client.auto_invoice_template || []) as { description: string; sacCode?: string; quantity: number; rate: number; amount: number }[]),
          currency: (client.auto_invoice_currency as string) || 'INR',
          taxRate: (client.auto_invoice_tax_rate as number) || 18,
          notes: (client.auto_invoice_notes as string) || undefined,
          terms: (client.auto_invoice_terms as string) || undefined,
        },
      }));

      await inngest.send(events);
    });

    return { message: `Dispatched auto-invoices for ${clients.length} client(s)`, count: clients.length };
  }
);

export const generateAutoInvoiceFn = inngest.createFunction(
  {
    id: 'generate-auto-invoice',
    retries: 3,
    throttle: { limit: 5, period: '10s' },
  },
  { event: 'invoice/auto-generate' },
  async ({ event, step }) => {
    const {
      clientId, clientName, clientEmail, autoSend,
      lineItems, currency, taxRate, notes, terms,
    } = event.data;

    // Step 1: Generate invoice number
    const invoiceNumber = await step.run('get-invoice-number', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase');
      const supabase = getSupabaseAdmin();

      const currentYear = new Date().getFullYear();

      // Atomic increment
      const { data, error } = await supabase.rpc('increment_invoice_counter', {
        p_year: currentYear,
      });

      if (error || !data) {
        // Fallback: read current + increment
        const { data: seq } = await supabase
          .from('invoice_sequences')
          .select('current_counter')
          .eq('current_year', currentYear)
          .single();

        const counter = (seq?.current_counter || 0) + 1;
        await supabase
          .from('invoice_sequences')
          .upsert({ prefix: 'FM', current_year: currentYear, current_counter: counter }, { onConflict: 'prefix' });

        return `FM${counter}/${currentYear}`;
      }

      return `FM${data}/${currentYear}`;
    });

    // Step 2: Fetch client details for invoice
    const client = await step.run('fetch-client-details', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase');
      const supabase = getSupabaseAdmin();

      const { data } = await supabase
        .from('clients')
        .select('id, name, email, phone, address, city, state, country, gst_number')
        .eq('id', clientId)
        .single();

      return data;
    });

    if (!client) {
      return { error: `Client ${clientId} not found` };
    }

    // Step 3: Calculate totals and create invoice
    const invoice = await step.run('create-invoice', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase');
      const supabase = getSupabaseAdmin();

      const items = (lineItems || []) as { description: string; sacCode?: string; quantity: number; rate: number; amount: number }[];
      const subtotal = items.reduce((sum, item) => sum + (item.amount || item.quantity * item.rate), 0);
      const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
      const total = subtotal + taxAmount;

      // GST split: same-state → CGST+SGST, different → IGST
      const clientState = (client.state || '').toLowerCase();
      const companyState = 'madhya pradesh'; // FM HQ
      const isSameState = clientState === companyState;
      const halfTax = Math.round(taxAmount / 2 * 100) / 100;

      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 15); // 15 days payment term

      const invoiceId = `inv-auto-${Date.now()}`;
      const status = autoSend ? 'sent' : 'draft';

      const record = {
        id: invoiceId,
        invoice_number: invoiceNumber,
        date: today.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        client_id: client.id,
        client_name: client.name,
        client_email: client.email || '',
        client_phone: client.phone || '',
        client_address: client.address || '',
        client_city: client.city || '',
        client_state: client.state || '',
        client_country: client.country || 'India',
        client_gst_number: client.gst_number || '',
        line_items: items,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        tax: taxAmount,
        total,
        currency: currency || 'INR',
        cgst_amount: isSameState ? halfTax : 0,
        sgst_amount: isSameState ? halfTax : 0,
        igst_amount: isSameState ? 0 : taxAmount,
        place_of_supply: client.state || '',
        company_gstin: '23BQNPM3447F1ZT',
        notes: notes || `Auto-generated invoice for ${today.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
        terms: terms || 'Payment due within 15 days of invoice date.',
        status,
        auto_generated: true,
      };

      const { error } = await supabase.from('invoices').insert(record);
      if (error) throw new Error(`Failed to create invoice: ${error.message}`);

      return { id: invoiceId, invoiceNumber, total, status, dueDate: record.due_date };
    });

    // Step 4: Send email if auto-send enabled
    if (autoSend && clientEmail) {
      await step.run('send-invoice-email', async () => {
        const { invoiceStatusEmail, notifyRecipient } = await import('@/lib/email/send');

        const emailData = invoiceStatusEmail({
          invoiceNumber: invoice.invoiceNumber,
          clientName: clientName,
          total: invoice.total,
          currency: currency || 'INR',
          dueDate: invoice.dueDate,
          status: 'sent',
        });

        await notifyRecipient(clientEmail, emailData.subject, emailData.html);
      });
    }

    // Step 5: Notify admin
    await step.run('notify-admin', async () => {
      await inngest.send({
        name: 'notification/send',
        data: {
          recipientType: 'admin' as const,
          type: 'invoice_created' as const,
          title: `Auto-invoice ${invoice.invoiceNumber} generated`,
          message: `${clientName} — ${currency || 'INR'} ${invoice.total.toLocaleString()} (${autoSend ? 'sent' : 'draft'})`,
          priority: 'normal' as const,
          actionUrl: `/admin/invoices`,
        },
      });
    });

    // Step 6: Audit log
    await step.run('audit-log', async () => {
      await inngest.send({
        name: 'audit/log',
        data: {
          user_id: 'system',
          user_name: 'Auto Invoice',
          action: 'create' as const,
          resource_type: 'invoice',
          resource_id: invoice.id,
          details: {
            invoiceNumber: invoice.invoiceNumber,
            clientName,
            total: invoice.total,
            autoGenerated: true,
            autoSent: autoSend,
          },
        },
      });
    });

    return {
      success: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      status: invoice.status,
    };
  }
);
