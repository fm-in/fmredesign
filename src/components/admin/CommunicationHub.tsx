/**
 * Communication Hub Component
 * Comprehensive client communication and collaboration center
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  MessageSquare,
  Send,
  Phone,
  Video,
  Calendar,
  FileText,
  Paperclip,
  Search,
  Filter,
  Star,
  Archive,
  MoreVertical,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  Mic,
  Camera,
  Settings,
  Bell,
  Hash
} from 'lucide-react';
import { Button } from '@/design-system/components/primitives/Button';
import { 
  ClientMessage, 
  ClientMeeting, 
  ActionItem,
  ClientProfile,
  MessageParticipant 
} from '@/lib/admin/client-types';
import { ClientService } from '@/lib/admin/client-service';

interface CommunicationHubProps {
  clientId?: string;
  onScheduleMeeting?: (meeting: Partial<ClientMeeting>) => void;
}

export function CommunicationHub({ clientId, onScheduleMeeting }: CommunicationHubProps) {
  const [activeTab, setActiveTab] = useState<'messages' | 'meetings' | 'notes' | 'calls'>('messages');
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [meetings, setMeetings] = useState<ClientMeeting[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [client, setClient] = useState<ClientProfile | null>(null);

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    if (!clientId) return;

    // Load client data (keep existing call)
    const clientData = await ClientService.getClientById(clientId);
    setClient(clientData);

    // Load messages from API instead of localStorage
    try {
      const res = await fetch(`/api/admin/messages?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        // Transform API response to match ClientMessage interface
        const apiMessages: ClientMessage[] = (data.data || []).map((m: Record<string, unknown>) => ({
          id: m.id as string,
          clientId: m.clientId as string,
          from: (m.senderType as string) === 'admin'
            ? { id: 'current-user', name: m.senderName as string, email: 'team@freakingminds.in', role: 'team_member' as const }
            : { id: m.clientId as string, name: m.senderName as string, email: '', role: 'client' as const },
          to: [],
          content: m.message as string,
          subject: m.subject as string | undefined,
          attachments: [],
          isRead: m.isRead as boolean,
          isInternal: false,
          priority: 'normal' as const,
          createdAt: m.createdAt as string,
        }));
        setMessages(apiMessages);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }

    // Meetings: no backend table yet, show empty
    setMeetings([]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !clientId) return;

    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          message: newMessage,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const apiMsg = data.data;
        const message: ClientMessage = {
          id: apiMsg.id,
          clientId,
          from: {
            id: 'current-user',
            name: apiMsg.senderName || 'Agency Team',
            email: 'team@freakingminds.in',
            role: 'team_member'
          },
          to: [{
            id: client?.primaryContact.id || '',
            name: client?.primaryContact.name || '',
            email: client?.primaryContact.email || '',
            role: 'client'
          }],
          content: apiMsg.message,
          attachments: [],
          isRead: false,
          isInternal: false,
          priority: 'normal',
          createdAt: apiMsg.createdAt,
        };
        setMessages([message, ...messages]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-fm-neutral-200 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-fm-neutral-900">Communication Hub</h2>
            <p className="text-fm-neutral-600 mt-1">
              {client ? `Manage communication with ${client.name}` : 'Client communication center'}
            </p>
          </div>

          <div className="flex items-center space-x-3 flex-wrap">
            <Button variant="secondary" size="sm">
              <Phone className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Call</span>
            </Button>
            <Button variant="secondary" size="sm">
              <Video className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Video Call</span>
            </Button>
            <Button size="sm" icon={<Calendar className="h-4 w-4" />}>
              <span className="hidden sm:inline">Schedule Meeting</span>
              <span className="sm:hidden">Meet</span>
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-6 bg-fm-neutral-100 p-1 rounded-lg w-fit max-w-full overflow-x-auto scrollbar-none">
          {[
            { id: 'messages', name: 'Messages', icon: MessageSquare, count: messages.length },
            { id: 'meetings', name: 'Meetings', icon: Calendar, count: meetings.length },
            { id: 'notes', name: 'Notes', icon: FileText, count: 0 },
            { id: 'calls', name: 'Call Logs', icon: Phone, count: 0 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-fm-magenta-700 shadow-sm'
                    : 'text-fm-neutral-600 hover:text-fm-neutral-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{tab.name}</span>
                {tab.count > 0 && (
                  <span className="bg-fm-magenta-100 text-fm-magenta-700 text-xs font-bold rounded-full px-2 py-0.5">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 h-96">
          {/* Conversation List */}
          <div className="bg-white rounded-xl shadow-sm border border-fm-neutral-200">
            <div className="p-4 border-b border-fm-neutral-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-fm-neutral-900">Conversations</h3>
                <Button size="sm" variant="secondary">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fm-neutral-400" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-fm-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-80">
              {client && (
                <div 
                  className={`p-4 border-b border-fm-neutral-100 cursor-pointer hover:bg-fm-neutral-50 ${
                    selectedConversation === client.id ? 'bg-fm-magenta-50 border-fm-magenta-200' : ''
                  }`}
                  onClick={() => setSelectedConversation(client.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-fm-magenta-100 rounded-full flex items-center justify-center">
                      <span className="text-fm-magenta-700 font-bold">
                        {client.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-fm-neutral-900 truncate">{client.name}</h4>
                      <p className="text-sm text-fm-neutral-600 truncate">
                        {messages[0]?.content || 'No messages yet'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-fm-neutral-500">
                        {messages[0] ? formatMessageTime(messages[0].createdAt) : ''}
                      </p>
                      {messages.filter(m => !m.isRead).length > 0 && (
                        <div className="w-2 h-2 bg-fm-magenta-600 rounded-full mt-1 ml-auto"></div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Message Thread */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-fm-neutral-200 flex flex-col">
            {selectedConversation && client ? (
              <>
                {/* Thread Header */}
                <div className="p-4 border-b border-fm-neutral-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-fm-magenta-100 rounded-full flex items-center justify-center">
                      <span className="text-fm-magenta-700 font-bold">
                        {client.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-fm-neutral-900">{client.name}</h4>
                      <p className="text-sm text-fm-neutral-600">{client.primaryContact.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-fm-neutral-100 rounded-lg">
                      <Phone className="h-4 w-4 text-fm-neutral-600" />
                    </button>
                    <button className="p-2 hover:bg-fm-neutral-100 rounded-lg">
                      <Video className="h-4 w-4 text-fm-neutral-600" />
                    </button>
                    <button className="p-2 hover:bg-fm-neutral-100 rounded-lg">
                      <MoreVertical className="h-4 w-4 text-fm-neutral-600" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.from.role === 'team_member' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.from.role === 'team_member'
                            ? 'bg-fm-magenta-600 text-white'
                            : 'bg-fm-neutral-100 text-fm-neutral-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.from.role === 'team_member' 
                            ? 'text-fm-magenta-100' 
                            : 'text-fm-neutral-500'
                        }`}>
                          {formatMessageTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center' }} className="py-8">
                      <MessageSquare className="h-12 w-12 text-fm-neutral-400 mx-auto mb-4" />
                      <h4 className="font-semibold text-fm-neutral-900 mb-2">Start the conversation</h4>
                      <p className="text-fm-neutral-600">Send your first message to {client.name}</p>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-fm-neutral-200">
                  <div className="flex items-center space-x-3">
                    <button className="p-2 hover:bg-fm-neutral-100 rounded-lg">
                      <Paperclip className="h-4 w-4 text-fm-neutral-600" />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="w-full px-4 py-2 border border-fm-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fm-magenta-700 focus:border-transparent"
                      />
                    </div>
                    <Button size="sm" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div style={{ textAlign: 'center' }}>
                  <MessageSquare className="h-12 w-12 text-fm-neutral-400 mx-auto mb-4" />
                  <h4 className="font-semibold text-fm-neutral-900 mb-2">No conversation selected</h4>
                  <p className="text-fm-neutral-600">Choose a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meetings Tab */}
      {activeTab === 'meetings' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-fm-neutral-200 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
              <h3 className="text-lg font-semibold text-fm-neutral-900">Meetings & Calls</h3>
              <Button size="sm" icon={<Plus className="h-4 w-4" />}>
                <span className="hidden sm:inline">Schedule Meeting</span>
                <span className="sm:hidden">Schedule</span>
              </Button>
            </div>
            
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="border border-fm-neutral-200 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 sm:space-x-3 mb-2">
                        <h4 className="font-semibold text-fm-neutral-900">{meeting.title}</h4>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {meeting.type.replace('_', ' ')}
                        </span>
                      </div>
                      
                      {meeting.description && (
                        <p className="text-sm text-fm-neutral-600 mb-3">{meeting.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 text-sm">
                        <div>
                          <p className="text-fm-neutral-500">Date & Time</p>
                          <p className="font-medium text-fm-neutral-900">
                            {new Date(meeting.startTime).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-fm-neutral-500">Duration</p>
                          <p className="font-medium text-fm-neutral-900">
                            {Math.round((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / (1000 * 60))} min
                          </p>
                        </div>
                        <div>
                          <p className="text-fm-neutral-500">Participants</p>
                          <p className="font-medium text-fm-neutral-900">
                            {(meeting.participants || []).length} people
                          </p>
                        </div>
                        <div>
                          <p className="text-fm-neutral-500">Location</p>
                          <p className="font-medium text-fm-neutral-900">
                            {meeting.meetingLink ? 'Online' : meeting.location || 'TBD'}
                          </p>
                        </div>
                      </div>
                      
                      {(meeting.actionItems || []).length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-fm-neutral-700 mb-2">Action Items:</p>
                          <ul className="space-y-1">
                            {(meeting.actionItems || []).map((item) => (
                              <li key={item.id} className="flex items-center space-x-2 text-sm">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                  item.isCompleted 
                                    ? 'bg-green-100 border-green-500' 
                                    : 'border-fm-neutral-300'
                                }`}>
                                  {item.isCompleted && (
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                  )}
                                </div>
                                <span className={item.isCompleted ? 'line-through text-fm-neutral-500' : 'text-fm-neutral-700'}>
                                  {item.description}
                                </span>
                                <span className="text-xs text-fm-neutral-500">
                                  ({item.assignedTo})
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 sm:ml-4">
                      {meeting.meetingLink && (
                        <Button size="sm" variant="secondary">
                          <Video className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Join</span>
                        </Button>
                      )}
                      <Button size="sm" variant="secondary">
                        <FileText className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Notes</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {meetings.length === 0 && (
                <div style={{ textAlign: 'center' }} className="py-8">
                  <Calendar className="h-12 w-12 text-fm-neutral-400 mx-auto mb-4" />
                  <h4 className="font-semibold text-fm-neutral-900 mb-2">No meetings scheduled</h4>
                  <p className="text-fm-neutral-600">Schedule your first meeting with the client</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="bg-white rounded-xl shadow-sm border border-fm-neutral-200 p-4 sm:p-6">
          <div style={{ textAlign: 'center' }} className="py-12">
            <FileText className="h-12 w-12 text-fm-neutral-400 mx-auto mb-4" />
            <h4 className="font-semibold text-fm-neutral-900 mb-2">Meeting Notes & Documentation</h4>
            <p className="text-fm-neutral-600">
              Centralized location for all meeting notes, call summaries, and important documentation
            </p>
          </div>
        </div>
      )}

      {/* Calls Tab */}
      {activeTab === 'calls' && (
        <div className="bg-white rounded-xl shadow-sm border border-fm-neutral-200 p-4 sm:p-6">
          <div style={{ textAlign: 'center' }} className="py-12">
            <Phone className="h-12 w-12 text-fm-neutral-400 mx-auto mb-4" />
            <h4 className="font-semibold text-fm-neutral-900 mb-2">Call History & Logs</h4>
            <p className="text-fm-neutral-600">
              Track all client calls, durations, and call summaries in one place
            </p>
          </div>
        </div>
      )}
    </div>
  );
}