/* ============================================================
   GX STORE — CURRENCY MODULE (shared)
   Base currency for all internal pricing is JOD.
   Every page includes this file before cart.js / page scripts.
   ============================================================ */

// Value of 1 JOD expressed in each supported currency (approximate, for display only)
const CURRENCIES = {
  JOD:{label:'دينار أردني',   flag:'🇯🇴', rate:1,      decimals:2},
  USD:{label:'دولار أمريكي',  flag:'🇺🇸', rate:1.41,   decimals:2},
  EUR:{label:'يورو',          flag:'🇪🇺', rate:1.30,   decimals:2},
  SAR:{label:'ريال سعودي',    flag:'🇸🇦', rate:5.30,   decimals:2},
  AED:{label:'درهم إماراتي',  flag:'🇦🇪', rate:5.18,   decimals:2},
  KWD:{label:'دينار كويتي',   flag:'🇰🇼', rate:0.435,  decimals:3},
  QAR:{label:'ريال قطري',     flag:'🇶🇦', rate:5.14,   decimals:2},
  OMR:{label:'ريال عماني',    flag:'🇴🇲', rate:0.543,  decimals:3},
  BHD:{label:'دينار بحريني',  flag:'🇧🇭', rate:0.531,  decimals:3},
  IQD:{label:'دينار عراقي',   flag:'🇮🇶', rate:1850,   decimals:0},
  EGP:{label:'جنيه مصري',     flag:'🇪🇬', rate:69,     decimals:0},
  MAD:{label:'درهم مغربي',    flag:'🇲🇦', rate:14,     decimals:2},
  DZD:{label:'دينار جزائري',  flag:'🇩🇿', rate:190,    decimals:0},
  TND:{label:'دينار تونسي',   flag:'🇹🇳', rate:4.4,    decimals:2},
};

const COUNTRY_TO_CURRENCY = {
  JO:'JOD', PS:'JOD',
  SA:'SAR', AE:'AED', KW:'KWD', QA:'QAR', OM:'OMR', BH:'BHD',
  IQ:'IQD', EG:'EGP', MA:'MAD', DZ:'DZD', TN:'TND',
  US:'USD', CA:'USD', GB:'USD',
  DE:'EUR', FR:'EUR', IT:'EUR', ES:'EUR', NL:'EUR', BE:'EUR', AT:'EUR', GR:'EUR', PT:'EUR', IE:'EUR', FI:'EUR'
};

const GXCurrency = (function(){
  let current = localStorage.getItem('gx_currency') || 'JOD';

  function get(){ return current; }

  function set(code, {persist=true} = {}){
    if(!CURRENCIES[code]) return;
    current = code;
    if(persist) localStorage.setItem('gx_currency', code);
    document.dispatchEvent(new CustomEvent('gx:currency-changed', {detail:{currency:current}}));
  }

  function format(jodAmount){
    const c = CURRENCIES[current] || CURRENCIES.JOD;
    const val = jodAmount * c.rate;
    const formatted = val.toLocaleString('en-US', {minimumFractionDigits:c.decimals, maximumFractionDigits:c.decimals});
    return `${formatted} ${current}`;
  }

  function populateSelect(selectEl){
    selectEl.innerHTML = '';
    Object.keys(CURRENCIES).forEach(code=>{
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = `${CURRENCIES[code].flag} ${code} — ${CURRENCIES[code].label}`;
      if(code === current) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  async function autoDetect(){
    // Only auto-detect if the visitor has never chosen a currency manually
    if(localStorage.getItem('gx_currency')) return;
    try{
      const res = await fetch('https://ipwho.is/');
      const data = await res.json();
      if(data && data.success && data.country_code){
        const cur = COUNTRY_TO_CURRENCY[data.country_code];
        if(cur) set(cur, {persist:false});
      }
    }catch(e){
      // silently keep default (JOD) if geo-detection fails, e.g. offline
    }
  }

  return {get, set, format, populateSelect, autoDetect};
})();
