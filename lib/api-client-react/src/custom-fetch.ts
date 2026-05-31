// ... (اترك السطور الأولى كما هي حتى سطر Module-level configuration)

// ---------------------------------------------------------------------------
// Module-level configuration
// ---------------------------------------------------------------------------

// تعديل هنا: قراءة الرابط من المتغير البيئي مباشرة كقيمة افتراضية
let _baseUrl: string | null = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || null;
let _authTokenGetter: AuthTokenGetter | null = null;

// ... (باقي الكود يظل كما هو دون تغيير حتى النهاية)
