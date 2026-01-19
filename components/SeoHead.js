import Head from 'next/head';
import { useRouter } from 'next/router';

const SITE_URL = 'https://pcc.mlwmlw.org';
const DEFAULT_TITLE = '開放政府標案';
const DEFAULT_DESCRIPTION = '開放政府標案目的是為了讓公民能更容易關心繳納的稅金如何被分配與使用，持續監督政商之利害關係，提供各種統計數據與最新趨勢案件。';
const DEFAULT_IMAGE = '/static/landing.jpg';

const toAbsoluteUrl = (value) => {
  if (!value) {
    return '';
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  return `${SITE_URL}${value}`;
};

export default function SeoHead({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  image,
  url,
  type = 'website',
  noIndex = false,
  children,
}) {
  const router = useRouter();
  const canonicalUrl = url || `${SITE_URL}${router.asPath}`;
  const ogImage = toAbsoluteUrl(image || DEFAULT_IMAGE);
  const twitterCard = ogImage ? 'summary_large_image' : 'summary';

  return (
    <Head>
      <title key="title">{title}</title>
      <meta key="description" name="description" content={description} />
      <link key="canonical" rel="canonical" href={canonicalUrl} />

      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:type" property="og:type" content={type} />
      <meta key="og:url" property="og:url" content={canonicalUrl} />
      <meta key="og:site_name" property="og:site_name" content={DEFAULT_TITLE} />
      {ogImage ? (
        <meta key="og:image" property="og:image" content={ogImage} />
      ) : null}

      <meta key="twitter:card" name="twitter:card" content={twitterCard} />
      <meta key="twitter:title" name="twitter:title" content={title} />
      <meta key="twitter:description" name="twitter:description" content={description} />
      {ogImage ? (
        <meta key="twitter:image" name="twitter:image" content={ogImage} />
      ) : null}

      {noIndex ? (
        <meta key="robots" name="robots" content="noindex, follow" />
      ) : null}
      {children}
    </Head>
  );
}
