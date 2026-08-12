import { NextRequest, NextResponse } from 'next/server';
import { authGuard, requireRole } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type AllowedRole = 'admin' | 'editor' | 'reviewer' | 'author' | 'public';

export interface AuthContext {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  user?: any;
  profile?: any;
}

export interface RouteConfig {
  roles: AllowedRole[];
  authorizeObject?: (req: NextRequest, ctx: AuthContext) => Promise<boolean> | boolean;
}

export function withAuth(
  config: RouteConfig,
  handler: (req: NextRequest, ctx: AuthContext, params?: any) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, { params }: { params?: any } = {}) => {
    const isPublic = config.roles.includes('public');
    
    // 1. Authentication
    const authResult = await authGuard(req);
    const supabaseAdmin = authResult?.supabaseAdmin || getSupabaseAdmin();
    
    if (!isPublic && (!authResult || !authResult.user)) {
      return NextResponse.json(
        {
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          detail: 'Authentication required'
        },
        { status: 401, headers: { 'Content-Type': 'application/problem+json' } }
      );
    }
    
    const ctx: AuthContext = { supabaseAdmin, user: authResult?.user };

    // 2. Coarse-Grained Authorization
    if (!isPublic && config.roles.length > 0) {
       let authorized = false;
       
       const profile = await requireRole(supabaseAdmin, ctx.user.id, config.roles);
       if (profile) {
          authorized = true;
          ctx.profile = profile;
       }
       
       if (!authorized) {
          return NextResponse.json(
            {
              type: 'about:blank',
              title: 'Forbidden',
              status: 403,
              detail: 'Insufficient role permissions'
            },
            { status: 403, headers: { 'Content-Type': 'application/problem+json' } }
          );
       }
    }

    // 3. Object-level Authorization
    if (config.authorizeObject) {
       const isObjectAuthorized = await config.authorizeObject(req, ctx);
       if (!isObjectAuthorized) {
          return NextResponse.json(
            {
              type: 'about:blank',
              title: 'Forbidden',
              status: 403,
              detail: 'Insufficient permissions for the requested resource'
            },
            { status: 403, headers: { 'Content-Type': 'application/problem+json' } }
          );
       }
    }
    
    return handler(req, ctx, params);
  };
}

export interface ActionConfig {
  roles: AllowedRole[];
  authorizeObject?: (payload: any, ctx: AuthContext) => Promise<boolean> | boolean;
}

export function withActionAuth<T extends any[], R>(
  config: ActionConfig,
  handler: (ctx: AuthContext, ...args: T) => Promise<R>
) {
  return async (...args: T): Promise<any> => {
    const isPublic = config.roles.includes('public');
    const supabaseAdmin = getSupabaseAdmin();
    
    // We expect args[0] to be payload, and args[1] to be accessToken in existing actions
    const payload = args[0] as any;
    const accessToken = args[1] as string | undefined;
    
    let user = null;

    if (accessToken) {
       const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
       if (!error && data?.user) user = data.user;
    }

    if (!user) {
      // Fallback to cookie-based auth
      try {
        const { getSupabaseServerClient } = await import('@/lib/supabaseServer');
        const supabaseServer = await getSupabaseServerClient();
        const { data: { user: cookieUser } } = await supabaseServer.auth.getUser();
        if (cookieUser) user = cookieUser;
      } catch (e) {
        // ignore
      }
    }
    
    if (!isPublic && !user) {
       return { success: false, error: 'Access Denied: You must be authenticated.' };
    }
    
    const ctx: AuthContext = { supabaseAdmin, user };
    
    // Check roles
    if (!isPublic && config.roles.length > 0) {
       const profile = await requireRole(supabaseAdmin, user!.id, config.roles);
       if (!profile) {
           return { success: false, error: 'Access Denied: Insufficient role permissions.' };
       }
       ctx.profile = profile;
    }
    
    if (config.authorizeObject) {
       const isObjectAuthorized = await config.authorizeObject(payload, ctx);
       if (!isObjectAuthorized) {
           return { success: false, error: 'Access Denied: Insufficient permissions for the requested resource.' };
       }
    }
    
    return handler(ctx, ...args);
  };
}
