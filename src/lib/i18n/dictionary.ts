// NOTE: Arabic translations are best-effort Modern Standard Arabic.
// Before launch, a native Arabic speaker from the family (ideally one
// familiar with Chaldean/Iraqi dialect) should proofread every `ar` key.

export type Lang = 'en' | 'ar';

type Dict = Record<string, string>;

export const I18N: Record<Lang, Dict> = {
  en: {
    'brand.title': 'Koja Family',
    'nav.home': 'Home',
    'nav.tree': 'Family Tree',
    'nav.feed': 'Feed',
    'nav.events': 'Events',
    'nav.calc': 'Relations',
    'nav.admin': 'Admin',
    'nav.login': 'Sign in',
    'nav.logout': 'Sign out',

    'home.hero.title': 'The House of Koja',
    'home.hero.arabic': 'بيت كوجا',
    'home.hero.tagline':
      'A private gathering place for the descendants of Hanna Koja — seven generations, three hundred thirty-five names, one lineage.',
    'home.hero.cta1': 'Find Your Place',
    'home.hero.cta2': 'Visit the Feed',
    'home.feed.title': 'From the Family',
    'home.feed.sub': 'Latest stories, announcements, and business from the line',
    'home.feed.more': 'See the full feed →',
    'home.feed.coming_soon': 'The feed opens in Phase 4.',
    'home.events.title': 'Gatherings',
    'home.events.sub': 'Upcoming in the family calendar',
    'home.events.more': 'View all events →',
    'home.events.coming_soon': 'Events open in Phase 4.',
    'home.stats.title': 'Our Roots',
    'home.stats.sub': 'By the numbers',
    'home.stats.total': 'Total descendants',
    'home.stats.generations': 'Generations',
    'home.stats.members': 'Registered members',
    'home.stats.pending': 'Awaiting approval',

    'tree.title': 'The Family Tree',
    'tree.sub': 'Every descendant of Hanna Koja. Click any name to see their profile.',
    'tree.search.placeholder': 'Search for anyone in the family…',
    'tree.search.empty': 'No one by that name',
    'tree.findme': 'Find me',
    'tree.reset': 'Reset view',
    'tree.people': 'people',
    'tree.legend': 'Legend',
    'tree.legend.claimed': 'Claimed',
    'tree.legend.unclaimed': 'Unclaimed',
    'tree.legend.you': 'You',
    'tree.legend.deceased': 'Deceased',
    'tree.help': 'Drag to pan · scroll to zoom · click any name to see the profile',

    'profile.back': '← Back to Tree',
    'profile.lineage': 'Lineage',
    'profile.details': 'Details',
    'profile.biography': 'Biography',
    'profile.field.name': 'Name',
    'profile.field.location': 'Location',
    'profile.field.born': 'Born',
    'profile.field.occupation': 'Occupation',
    'profile.field.phone': 'Phone',
    'profile.field.email': 'Email',
    'profile.field.children': 'Children',
    'profile.action.edit': 'Edit your profile',
    'profile.action.claimed': 'Claimed',
    'profile.action.claim': 'This is me',
    'profile.your': 'Your',
    'profile.your.profile': 'Your profile',
    'profile.generation': 'Generation',
    'profile.no_children': 'None recorded',
    'profile.no_bio':
      'Biography not yet written. Once this spot is claimed, the family member can tell their story here.',
    'profile.not_set': '(not set)',
    'profile.not_related': 'Not related',
    'profile.note': 'Note',

    'feed.title': 'The Feed',
    'feed.sub': 'Posts, stories, and news from across the family',
    'feed.composer.placeholder': 'Share something with the family…',
    'feed.kind.general': 'General Post',
    'feed.kind.story': 'Family Story',
    'feed.kind.business': 'Business / Service',
    'feed.kind.announcement': 'Announcement',
    'feed.post': 'Post to Family',
    'feed.action.appreciate': '♡ Appreciate',
    'feed.action.comment': '💬 Comment',
    'feed.action.share': '↗ Share with family',
    'feed.you': 'You',

    'events.title': 'Family Gatherings',
    'events.sub': 'Weddings, birthdays, reunions — everything that brings us together',
    'events.upcoming': 'Upcoming',
    'events.schedule': '+ Schedule an event',
    'events.organized_by': 'Organized by',

    'calc.title': 'Relationship Finder',
    'calc.sub': "Pick any two family members and see exactly how you're connected",
    'calc.first': 'First person',
    'calc.second': 'Second person',
    'calc.placeholder': 'Type a name…',
    'calc.empty': 'Select two people to see the relationship',
    'calc.try': 'Try these:',
    'calc.mrca': 'Most recent common ancestor',
    'calc.and': 'and',
    'calc.are': 'are',
    'calc.gens_below_a': 'is {n} generation(s) below',

    'login.title': 'Sign in',
    'login.sub': 'Sign in to post, comment, edit your profile, and manage the tree.',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.submit': 'Sign in',
    'login.error': 'Email or password is incorrect.',
    'login.no_account': 'Haven\u2019t claimed your spot yet?',
    'login.claim_link': 'Find your place on the tree →',

    'rel.self': 'self',
    'rel.father': 'father',
    'rel.son': 'son',
    'rel.brother': 'brother',
    'rel.grandfather': 'grandfather',
    'rel.grandson': 'grandson',
    'rel.uncle': 'uncle',
    'rel.nephew': 'nephew',
    'rel.great_prefix': 'great-',
    'rel.cousin': 'cousin',
    'rel.once_removed': 'once removed',
    'rel.twice_removed': 'twice removed',
    'rel.times_removed': 'times removed',
    'rel.not_related': 'not related',

    'lineage.you_marker': '(you)',

    'month.jan': 'JAN', 'month.feb': 'FEB', 'month.mar': 'MAR',
    'month.apr': 'APR', 'month.may': 'MAY', 'month.jun': 'JUN',
    'month.jul': 'JUL', 'month.aug': 'AUG', 'month.sep': 'SEP',
    'month.oct': 'OCT', 'month.nov': 'NOV', 'month.dec': 'DEC',
  },

  ar: {
    'brand.title': 'عائلة كوجا',
    'nav.home': 'الرئيسية',
    'nav.tree': 'شجرة العائلة',
    'nav.feed': 'المنشورات',
    'nav.events': 'المناسبات',
    'nav.calc': 'القرابة',
    'nav.admin': 'الإدارة',
    'nav.login': 'تسجيل الدخول',
    'nav.logout': 'تسجيل الخروج',

    'home.hero.title': 'بيت كوجا',
    'home.hero.arabic': 'بيت كوجا',
    'home.hero.tagline':
      'مكان خاص لأبناء وأحفاد حنّا كوجا — سبعة أجيال، ثلاثمئة وخمسة وثلاثون اسمًا، وسلالة واحدة.',
    'home.hero.cta1': 'اعثر على مكانك',
    'home.hero.cta2': 'تصفّح المنشورات',
    'home.feed.title': 'من العائلة',
    'home.feed.sub': 'أحدث القصص والإعلانات والأعمال من أبناء السلالة',
    'home.feed.more': '← اطّلع على جميع المنشورات',
    'home.feed.coming_soon': 'تفتح المنشورات في المرحلة الرابعة.',
    'home.events.title': 'اللقاءات',
    'home.events.sub': 'القادم في تقويم العائلة',
    'home.events.more': '← جميع المناسبات',
    'home.events.coming_soon': 'تفتح المناسبات في المرحلة الرابعة.',
    'home.stats.title': 'جذورنا',
    'home.stats.sub': 'بالأرقام',
    'home.stats.total': 'مجموع الأحفاد',
    'home.stats.generations': 'الأجيال',
    'home.stats.members': 'الأعضاء المسجّلون',
    'home.stats.pending': 'بانتظار الموافقة',

    'tree.title': 'شجرة العائلة',
    'tree.sub': 'جميع أبناء حنّا كوجا. اضغط على أيّ اسم لعرض ملفّه الشخصي.',
    'tree.search.placeholder': 'ابحث عن أي فرد في العائلة…',
    'tree.search.empty': 'لا يوجد أحد بهذا الاسم',
    'tree.findme': 'اعثر عليّ',
    'tree.reset': 'إعادة ضبط العرض',
    'tree.people': 'شخصًا',
    'tree.legend': 'الدليل',
    'tree.legend.claimed': 'مُطالَب به',
    'tree.legend.unclaimed': 'غير مُطالَب به',
    'tree.legend.you': 'أنت',
    'tree.legend.deceased': 'متوفّى',
    'tree.help': 'اسحب للتنقّل · مرّر للتكبير · انقر على أيّ اسم لعرض الملف',

    'profile.back': 'العودة إلى الشجرة →',
    'profile.lineage': 'السلسلة',
    'profile.details': 'التفاصيل',
    'profile.biography': 'السيرة',
    'profile.field.name': 'الاسم',
    'profile.field.location': 'الموقع',
    'profile.field.born': 'الميلاد',
    'profile.field.occupation': 'المهنة',
    'profile.field.phone': 'الهاتف',
    'profile.field.email': 'البريد الإلكتروني',
    'profile.field.children': 'الأبناء',
    'profile.action.edit': 'تعديل ملفّك',
    'profile.action.claimed': 'مُطالَب به',
    'profile.action.claim': 'هذا أنا',
    'profile.your': '',
    'profile.your.profile': 'ملفّك الشخصي',
    'profile.generation': 'الجيل',
    'profile.no_children': 'لا يوجد',
    'profile.no_bio':
      'لم تُكتب السيرة بعد. عندما يُطالِب أحد أفراد العائلة بهذا المكان، سيتمكّن من كتابة سيرته هنا.',
    'profile.not_set': '(غير محدَّد)',
    'profile.not_related': 'لا توجد قرابة',
    'profile.note': 'ملاحظة',

    'feed.title': 'المنشورات',
    'feed.sub': 'قصص وأخبار وإعلانات من جميع أفراد العائلة',
    'feed.composer.placeholder': 'شارك شيئًا مع العائلة…',
    'feed.kind.general': 'منشور عام',
    'feed.kind.story': 'قصة عائلية',
    'feed.kind.business': 'عمل / خدمة',
    'feed.kind.announcement': 'إعلان',
    'feed.post': 'انشر للعائلة',
    'feed.action.appreciate': '♡ إعجاب',
    'feed.action.comment': '💬 تعليق',
    'feed.action.share': '↗ شارك مع العائلة',
    'feed.you': 'أنت',

    'events.title': 'لقاءات العائلة',
    'events.sub': 'أعراس، أعياد ميلاد، لقاءات — كلّ ما يجمعنا',
    'events.upcoming': 'القادمة',
    'events.schedule': '+ جدولة مناسبة',
    'events.organized_by': 'نظّمها',

    'calc.title': 'حاسبة القرابة',
    'calc.sub': 'اختر أي شخصين من العائلة لترى صلة القرابة بينهما بالضبط',
    'calc.first': 'الشخص الأول',
    'calc.second': 'الشخص الثاني',
    'calc.placeholder': 'اكتب اسمًا…',
    'calc.empty': 'اختر شخصين لعرض صلة القرابة',
    'calc.try': 'جرّب:',
    'calc.mrca': 'أقرب جدّ مشترك',
    'calc.and': 'و',
    'calc.are': 'هما',
    'calc.gens_below_a': 'يبعد {n} جيلًا',

    'login.title': 'تسجيل الدخول',
    'login.sub': 'سجّل دخولك لتنشر وتعلّق وتعدّل ملفّك وتدير الشجرة.',
    'login.email': 'البريد الإلكتروني',
    'login.password': 'كلمة السر',
    'login.submit': 'دخول',
    'login.error': 'البريد أو كلمة السر غير صحيحة.',
    'login.no_account': 'لم تطالِب بمكانك بعد؟',
    'login.claim_link': 'اعثر على مكانك في الشجرة ←',

    'rel.self': 'نفس الشخص',
    'rel.father': 'والد',
    'rel.son': 'ابن',
    'rel.brother': 'شقيق',
    'rel.grandfather': 'جدّ',
    'rel.grandson': 'حفيد',
    'rel.uncle': 'عمّ',
    'rel.nephew': 'ابن الأخ',
    'rel.great_prefix': 'أكبر ',
    'rel.cousin': 'ابن عمّ',
    'rel.once_removed': 'مع فارق جيل واحد',
    'rel.twice_removed': 'مع فارق جيلين',
    'rel.times_removed': 'مع فارق {n} أجيال',
    'rel.not_related': 'لا توجد قرابة',

    'lineage.you_marker': '(أنت)',

    'month.jan': 'ك٢', 'month.feb': 'شبا', 'month.mar': 'آذار',
    'month.apr': 'نيس', 'month.may': 'أيار', 'month.jun': 'حزي',
    'month.jul': 'تمو', 'month.aug': 'آب', 'month.sep': 'أيلول',
    'month.oct': 'ت١', 'month.nov': 'ت٢', 'month.dec': 'ك١',
  },
};

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const dict = I18N[lang] || I18N.en;
  let s = dict[key];
  if (s == null) s = I18N.en[key] != null ? I18N.en[key] : key;
  if (vars) {
    for (const k of Object.keys(vars)) {
      s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
    }
  }
  return s;
}

export function ordinal(n: number, lang: Lang): string {
  if (lang === 'ar') {
    const ar: Record<number, string> = {
      1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع', 5: 'الخامس',
      6: 'السادس', 7: 'السابع', 8: 'الثامن', 9: 'التاسع', 10: 'العاشر',
    };
    return ar[n] || `الـ${n}`;
  }
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
