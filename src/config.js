export const APP_CONFIG = {
  productName: 'Schwambach | Avaliação dos Caixas',
  productTagline: 'Sua opinião melhora nosso atendimento',
  companyName: 'Supermercado Schwambach',
  baseDomain: 'SEU-DOMINIO.vercel.app',
  supportEmail: 'joaopaulo@tajodigital.com.br',

  // PREENCHA para usar o Supabase real. A anon key pode ficar no frontend;
  // a segurança é garantida pelas políticas RLS e RPCs do banco.
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseAnonKey: 'SUA_CHAVE_ANON_PUBLICA',

  // true = demonstração comercial sem banco. false = Supabase real.
  // Se URL/chave estiverem com placeholder, o sistema entra em demo automaticamente.
  demoMode: false,

  defaultTenantSlug: 'supermercado-schwambach',
  defaultPointSlug: 'caixa-01',
  setupPrice: 390,
  monthlyPrice: 390,
  pointLimit: 12,
  logoPath: '/schwambach-logo.png'
}

export function isDemoMode() {
  return APP_CONFIG.demoMode ||
    !APP_CONFIG.supabaseUrl.startsWith('https://') ||
    APP_CONFIG.supabaseUrl.includes('SEU-PROJETO') ||
    APP_CONFIG.supabaseAnonKey.includes('SUA_CHAVE')
}
