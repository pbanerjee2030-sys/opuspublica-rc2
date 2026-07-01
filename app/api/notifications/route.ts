import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function requireAdminOrEditor(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const supabaseAdmin = getSupabaseAdmin();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: any; error: any };
  if (!profile || (profile.role !== 'admin' && profile.role !== 'editor')) return null;
  return supabaseAdmin;
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = await requireAdminOrEditor(request);
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { type, articleId, recipientEmail, recipientName, articleTitle, journalName, rejectionReason } = body;

    if (!type || !recipientEmail) {
      if (type === 'review_assigned') {
        console.log(`[Email Notification] ${type}: Article=${articleTitle} (no recipient email provided, skipping)`);
        return NextResponse.json({ success: true, message: 'Notification logged (no recipient email)' });
      }
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.log(`[Email Notification] ${type}: To=${recipientEmail}, Article=${articleTitle}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Email notification logged (Resend API key not configured)',
        logged: true
      });
    }

    let subject = '';
    let html = '';

    const baseStyles = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #1A1A2E; padding: 30px; text-align: center;">
          <h1 style="color: #C9A84C; margin: 0; font-size: 24px; font-family: Georgia, serif;">Opus Publica</h1>
          <p style="color: #ffffff80; margin: 5px 0 0; font-size: 12px;">Global Public Policy Research & Publishing</p>
        </div>
        <div style="padding: 30px; color: #333;">
    `;

    const footerStyles = `
        </div>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 11px; color: #666;">
          <p>Advocacy Unified Network | Fluwelen Burgwal 58, 2511 CJ Den Haag, Netherlands</p>
          <p>This is an automated notification from Opus Publica.</p>
        </div>
      </div>
    `;

    switch (type) {
      case 'submission_received':
        subject = `Manuscript Submission Received - ${articleTitle}`;
        html = `${baseStyles}
          <h2 style="color: #1A1A2E; font-size: 18px;">Submission Received</h2>
          <p>Dear ${recipientName || 'Author'},</p>
          <p>Thank you for submitting your manuscript to Opus Publica. We have received your submission and it is now under review.</p>
          <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #C9A84C; margin: 20px 0;">
            <p style="margin: 0;"><strong>Article Title:</strong> ${articleTitle}</p>
            <p style="margin: 5px 0 0;"><strong>Journal:</strong> ${journalName}</p>
            <p style="margin: 5px 0 0;"><strong>Status:</strong> Pending Review</p>
          </div>
          <p>Our editorial team will review your submission and get back to you within 2-4 weeks.</p>
          <p>Best regards,<br/>The Opus Publica Editorial Team</p>
        ${footerStyles}`;
        break;

      case 'article_published':
        subject = `Article Published - ${articleTitle}`;
        html = `${baseStyles}
          <h2 style="color: #1A1A2E; font-size: 18px;">Article Published!</h2>
          <p>Dear ${recipientName || 'Author'},</p>
          <p>We are pleased to inform you that your manuscript has been accepted and published on Opus Publica.</p>
          <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #22c55e; margin: 20px 0;">
            <p style="margin: 0;"><strong>Article Title:</strong> ${articleTitle}</p>
            <p style="margin: 5px 0 0;"><strong>Journal:</strong> ${journalName}</p>
            <p style="margin: 5px 0 0;"><strong>Status:</strong> Published</p>
          </div>
          <p>Your article is now available for the global research community to discover and cite.</p>
          <p>Best regards,<br/>The Opus Publica Editorial Team</p>
        ${footerStyles}`;
        break;

      case 'article_rejected':
        subject = `Manuscript Update - ${articleTitle}`;
        html = `${baseStyles}
          <h2 style="color: #1A1A2E; font-size: 18px;">Manuscript Decision</h2>
          <p>Dear ${recipientName || 'Author'},</p>
          <p>After careful consideration by our editorial board, we regret to inform you that your manuscript has not been accepted for publication in its current form.</p>
          <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
            <p style="margin: 0;"><strong>Article Title:</strong> ${articleTitle}</p>
            <p style="margin: 5px 0 0;"><strong>Journal:</strong> ${journalName}</p>
            ${rejectionReason ? `<p style="margin: 5px 0 0;"><strong>Comments:</strong> ${rejectionReason}</p>` : ''}
          </div>
          <p>We encourage you to revise your manuscript based on the feedback provided and consider resubmitting.</p>
          <p>Best regards,<br/>The Opus Publica Editorial Team</p>
        ${footerStyles}`;
        break;

      case 'review_assigned':
        subject = `Review Assignment - ${articleTitle}`;
        html = `${baseStyles}
          <h2 style="color: #1A1A2E; font-size: 18px;">New Review Assignment</h2>
          <p>Dear ${recipientName || 'Reviewer'},</p>
          <p>You have been assigned as a reviewer for a manuscript submission on Opus Publica.</p>
          <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #C9A84C; margin: 20px 0;">
            <p style="margin: 0;"><strong>Article Title:</strong> ${articleTitle}</p>
            <p style="margin: 5px 0 0;"><strong>Journal:</strong> ${journalName}</p>
          </div>
          <p>Please log in to the reviewer portal to access the manuscript and submit your review.</p>
          <p>Best regards,<br/>The Opus Publica Editorial Team</p>
        ${footerStyles}`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Opus Publica <notifications@opuspublica.com>',
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Resend API error:', errorData);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Email notification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
