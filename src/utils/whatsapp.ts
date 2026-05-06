import axios from 'axios';

interface WaParameter {
  type: string;
  text?: string;
  [key: string]: any;
}

interface WaComponent {
  type: string;
  parameters?: WaParameter[];
  sub_type?: string;
  index?: string;
}

interface SendWaTemplateOptions {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: WaComponent[];
}

export function sanitizePhone(phone?: string): string {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = '91' + digits;
  return digits;
}

function normalizeComponents(components: WaComponent[]): WaComponent[] {
  return components.map((comp) => ({
    ...comp,
    parameters: comp.parameters?.map((p) => ({
      type: p.type,
      text: String(p.text ?? ''),
    })),
  }));
}

export async function sendWhatsAppTemplate({ to, templateName, languageCode = 'en_US', components = [] }: SendWaTemplateOptions): Promise<void> {
  const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
  const accessToken = process.env.WA_ACCESS_TOKEN;
  const apiVersion = process.env.WA_API_VERSION || 'v20.0';

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials not configured (WA_PHONE_NUMBER_ID / WA_ACCESS_TOKEN)');
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const safeComponents = normalizeComponents(components);

  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(safeComponents.length ? { components: safeComponents } : {}),
    },
  };

  try {
    await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
  } catch (err: any) {
    const detail = err?.response?.data ? JSON.stringify(err.response.data) : err?.message;
    console.error('[WA] sendWhatsAppTemplate failed:', detail);
    console.error('[WA] payload was:', JSON.stringify(payload));
    throw err;
  }
}
