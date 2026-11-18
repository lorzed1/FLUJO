// @ts-nocheck - Runtime Deno (Supabase Edge Function)
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_ACTIONS = new Set([
    'cash-registers/list-cash-registers',
    'cashier/open-session',
    'cashier/update-session',
    'cash-closures/get-cash-declaration-context',
    'cash-closures/confirm-cash-declaration',
    'cash-closures/reset-cash-declaration',
    'cash-closures/get-close-summary',
    'cash-closures/get-zreport',
    'cash-closures/list-paid-orders',
    'cash-closures/list-comp-orders',
    'cash-closures/list-pending-orders',
    'cash-closures/set-base-return',
    'cash-closures/confirm-close',
    'pos-order/get-order-guests',
]);

let cachedToken: string | null = null;

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

async function fetchRestofyToken(baseUrl: string, apiKey: string, tenantKey: string): Promise<string> {
    const res = await fetch(`${baseUrl}/auth/create-api-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, tenantKey }),
    });

    const data = await res.json().catch(() => null);
    const token = data?.data?.accessToken ?? data?.accessToken;

    if (!res.ok || !token) {
        const msg = data?.message || `Error autenticando con Restofy (HTTP ${res.status})`;
        throw new Error(msg);
    }

    cachedToken = token;
    return token;
}

async function callRestofy(
    baseUrl: string,
    apiKey: string,
    tenantKey: string,
    module: string,
    action: string,
    payload: Record<string, unknown>,
    forceRefresh = false
): Promise<{ status: number; body: unknown }> {
    const token = !forceRefresh && cachedToken
        ? cachedToken
        : await fetchRestofyToken(baseUrl, apiKey, tenantKey);

    const res = await fetch(`${baseUrl}/${module}/${action}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Key': tenantKey,
        },
        body: JSON.stringify(payload ?? {}),
    });

    if (res.status === 401 && !forceRefresh) {
        return callRestofy(baseUrl, apiKey, tenantKey, module, action, payload, true);
    }

    const body = await res.json().catch(() => ({
        success: false,
        message: `Respuesta no JSON de Restofy (HTTP ${res.status})`,
        data: null,
    }));

    return { status: res.status, body };
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return jsonResponse({ success: false, message: 'Método no permitido' }, 405);
    }

    try {
        const apiKey = Deno.env.get('RESTOFY_API_KEY');
        const tenantKey = Deno.env.get('RESTOFY_TENANT_KEY');
        const baseUrl = (Deno.env.get('RESTOFY_API_URL') || 'https://restofy.pro/api').replace(/\/+$/, '');

        if (!apiKey || !tenantKey) {
            return jsonResponse(
                {
                    success: false,
                    message: 'Faltan secretos RESTOFY_API_KEY o RESTOFY_TENANT_KEY en la Edge Function.',
                },
                500
            );
        }

        const { module, action, payload } = await req.json();
        const routeKey = `${module}/${action}`;

        if (!module || !action || !ALLOWED_ACTIONS.has(routeKey)) {
            return jsonResponse(
                { success: false, message: `Acción no permitida o inválida: ${routeKey}` },
                400
            );
        }

        const result = await callRestofy(baseUrl, apiKey, tenantKey, module, action, payload || {});
        return jsonResponse(result.body, result.status >= 500 ? 502 : result.status);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno en restofy-proxy';
        return jsonResponse({ success: false, message }, 500);
    }
});
