import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const BASE_URL = 'https://www.opuspublica.com';
const REPOSITORY_NAME = 'Opus Publica';
const PROTOCOL_VERSION = '2.0';
const EARLIEST_DATESTAMP = '2026-01-01T00:00:00Z';

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function badVerbError(verb: string | null): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${new Date().toISOString()}</responseDate>
  <request>${BASE_URL}/api/oai</request>
  <error code="badVerb">Illegal OAI-PMH verb: ${xmlEscape(verb || '')}</error>
</OAI-PMH>`;
}

function badArgumentError(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${new Date().toISOString()}</responseDate>
  <request>${BASE_URL}/api/oai</request>
  <error code="badArgument">Missing or invalid argument</error>
</OAI-PMH>`;
}

function identifyResponse(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${new Date().toISOString()}</responseDate>
  <request verb="identify">${BASE_URL}/api/oai</request>
  <Identify>
    <repositoryName>${xmlEscape(REPOSITORY_NAME)}</repositoryName>
    <baseURL>${BASE_URL}/api/oai</baseURL>
    <protocolVersion>${PROTOCOL_VERSION}</protocolVersion>
    <adminEmail>admin@opuspublica.com</adminEmail>
    <earliestDatestamp>${EARLIEST_DATESTAMP}</earliestDatestamp>
    <deletedRecord>transient</deletedRecord>
    <compression>gzip</compression>
  </Identify>
</OAI-PMH>`;
}

function listMetadataFormatsResponse(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${new Date().toISOString()}</responseDate>
  <request verb="ListMetadataFormats">${BASE_URL}/api/oai</request>
  <ListMetadataFormats>
    <metadataFormat>
      <metadataPrefix>oai_dc</metadataPrefix>
      <schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>
      <namespace>http://purl.org/dc/elements/1.1/</namespace>
    </metadataFormat>
  </ListMetadataFormats>
</OAI-PMH>`;
}

function articleToOaiRecord(article: any, journal: any, authors: string[], baseUrl: string): string {
  const doi = article.doi || '';
  const publishedDate = article.published_at ? article.published_at.split('T')[0] : '';
  const journalName = journal?.name || 'Opus Publica';
  const licenseType = journal?.license_type || '';
  const licenseUrl = journal?.license_url || '';

  const articleUrl = `${baseUrl}/${journal?.slug || 'journal'}/article/${article.id}`;

  const dcCreators = authors.map(a => `      <dc:creator>${xmlEscape(a)}</dc:creator>`).join('\n');
  const dcIdentifiers = [
    `      <dc:identifier>${xmlEscape(articleUrl)}</dc:identifier>`,
    ...(doi ? [`      <dc:identifier>https://doi.org/${xmlEscape(doi)}</dc:identifier>`] : []),
  ].join('\n');

  const rights = licenseUrl
    ? `${licenseType || 'Open Access'}: ${licenseUrl}`
    : licenseType || 'Open Access';

  return `    <record>
      <header>
        <identifier>oai:${REPOSITORY_NAME.toLowerCase().replace(/\s+/g, '')}:${article.id}</identifier>
        <datestamp>${publishedDate}</datestamp>
        <setSpec>published</setSpec>
      </header>
      <metadata>
        <oai_dc:dc
          xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
          xmlns:dc="http://purl.org/dc/elements/1.1/"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
      <dc:title>${xmlEscape(article.title)}</dc:title>
${dcCreators}
      <dc:description>${xmlEscape(article.abstract || '')}</dc:description>
      <dc:publisher>${xmlEscape(journalName)}</dc:publisher>
      <dc:date>${publishedDate}</dc:date>
${dcIdentifiers}
      <dc:type>text</dc:type>
      <dc:language>en</dc:language>
      <dc:rights>${xmlEscape(rights)}</dc:rights>
        </oai_dc:dc>
      </metadata>
    </record>`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const verb = searchParams.get('verb');
  const metadataPrefix = searchParams.get('metadataPrefix');
  const identifier = searchParams.get('identifier');
  const set = searchParams.get('set');

  if (!verb) {
    return new NextResponse(badArgumentError(), {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }

  const validVerbs = ['Identify', 'ListMetadataFormats', 'ListRecords', 'ListIdentifiers', 'GetRecord'];
  if (!validVerbs.includes(verb)) {
    return new NextResponse(badVerbError(verb), {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }

  if (verb === 'Identify') {
    return new NextResponse(identifyResponse(), {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }

  if (verb === 'ListMetadataFormats') {
    return new NextResponse(listMetadataFormatsResponse(), {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }

  if (verb === 'GetRecord') {
    if (!identifier || !metadataPrefix || metadataPrefix !== 'oai_dc') {
      return new NextResponse(badArgumentError(), {
        status: 200,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const articleId = identifier.split(':').pop() || '';

    const { data: article } = await supabaseAdmin
      .from('articles')
      .select(`
        id, title, abstract, doi, published_at, status,
        journals ( name, slug, license_type, license_url ),
        article_authors (
          profiles ( full_name ),
          co_author_name
        )
      `)
      .eq('id', articleId)
      .eq('status', 'published')
      .single() as { data: any };

    if (!article) {
      return new NextResponse(badArgumentError(), {
        status: 200,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      });
    }

    const authors = article.article_authors
      ?.map((aa: any) => aa.profiles?.full_name || aa.co_author_name)
      .filter(Boolean) || [];

    const record = articleToOaiRecord(article, article.journals, authors, BASE_URL);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${new Date().toISOString()}</responseDate>
  <request verb="GetRecord" identifier="${xmlEscape(identifier)}" metadataPrefix="oai_dc">${BASE_URL}/api/oai</request>
  <GetRecord>
${record}
  </GetRecord>
</OAI-PMH>`;

    return new NextResponse(xml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }

  // ListRecords and ListIdentifiers
  if (metadataPrefix !== 'oai_dc') {
    return new NextResponse(badArgumentError(), {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select(`
      id, title, abstract, doi, published_at,
      journals ( name, slug, license_type, license_url ),
      article_authors (
        profiles ( full_name ),
        co_author_name
      )
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: true }) as { data: any[] };

  const includeMetadata = verb === 'ListRecords';
  const records = (articles || []).map((article) => {
    const authors = article.article_authors
      ?.map((aa: any) => aa.profiles?.full_name || aa.co_author_name)
      .filter(Boolean) || [];

    if (includeMetadata) {
      return articleToOaiRecord(article, article.journals, authors, BASE_URL);
    }

    const publishedDate = article.published_at ? article.published_at.split('T')[0] : '';
    return `    <header>
      <identifier>oai:${REPOSITORY_NAME.toLowerCase().replace(/\s+/g, '')}:${article.id}</identifier>
      <datestamp>${publishedDate}</datestamp>
      <setSpec>published</setSpec>
    </header>`;
  });

  const containerTag = includeMetadata ? 'ListRecords' : 'ListIdentifiers';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${new Date().toISOString()}</responseDate>
  <request verb="${verb}" metadataPrefix="oai_dc">${BASE_URL}/api/oai</request>
  <${containerTag}>
${records.join('\n')}
  </${containerTag}>
</OAI-PMH>`;

  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
