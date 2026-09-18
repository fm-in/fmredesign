import { NextResponse } from 'next/server';

export const ApiResponse = {
  success: <T>(data: T, meta?: Record<string, unknown>, status = 200) =>
    NextResponse.json({ success: true, data, ...meta }, { status }),

  error: (message: string, status = 500) =>
    NextResponse.json({ success: false, error: message }, { status }),

  validationError: (message: string) =>
    NextResponse.json({ success: false, error: message }, { status: 400 }),

  notFound: (message = 'Not found') =>
    NextResponse.json({ success: false, error: message }, { status: 404 }),

  unauthorized: (message = 'Unauthorized') =>
    NextResponse.json({ success: false, error: message }, { status: 401 }),
};
