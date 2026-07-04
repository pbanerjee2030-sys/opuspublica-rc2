/**
 * Utility to escape unsafe characters for XML compliance.
 */
export function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Utility to split full names into given name and surname for XML nodes.
 */
export function splitName(fullName: string): { given: string; surname: string } {
  const name = fullName.trim();
  if (!name) return { given: '', surname: 'Unknown' };
  const parts = name.split(/\s+/);
  if (parts.length === 1) {
    return { given: '', surname: parts[0] };
  }
  const surname = parts[parts.length - 1];
  const given = parts.slice(0, parts.length - 1).join(' ');
  return { given, surname };
}

/**
 * Generates Crossref metadata deposit XML schema version 4.4.2
 */
export function generateCrossrefXml(articleData: {
  title: string;
  abstract?: string | null;
  doi: string;
  url: string;
  publishedAt: string;
  journalName: string;
  journalIssn?: string | null;
  authors: Array<{
    full_name: string;
    orcid?: string | null;
    affiliation?: string | null;
    ror_id?: string | null;
  }>;
  funderName?: string | null;
  funderAwardNumber?: string | null;
  funderId?: string | null;
}): string {
  const batchId = `deposit_${articleData.doi.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  const timestamp = Date.now();
  const pubDate = new Date(articleData.publishedAt);
  const year = pubDate.getFullYear();
  const month = String(pubDate.getMonth() + 1).padStart(2, '0');
  const day = String(pubDate.getDate()).padStart(2, '0');

  // Escape all text inputs
  const escapedTitle = escapeXml(articleData.title);
  const escapedAbstract = articleData.abstract ? escapeXml(articleData.abstract) : '';
  const escapedJournalName = escapeXml(articleData.journalName);
  const escapedJournalIssn = articleData.journalIssn ? escapeXml(articleData.journalIssn) : '';
  const escapedDoi = escapeXml(articleData.doi);
  const escapedUrl = escapeXml(articleData.url);

  // Form contributors XML
  let contributorsXml = '';
  if (articleData.authors && articleData.authors.length > 0) {
    contributorsXml = '<contributors>\n';
    articleData.authors.forEach((author, index) => {
      const { given, surname } = splitName(author.full_name);
      const seq = index === 0 ? 'first' : 'additional';
      contributorsXml += `          <person_name sequence="${seq}" contributor_role="author">\n`;
      if (given) {
        contributorsXml += `            <given_name>${escapeXml(given)}</given_name>\n`;
      }
      contributorsXml += `            <surname>${escapeXml(surname)}</surname>\n`;
      
      // Affiliations with optional ROR ID
      if (author.affiliation?.trim() || author.ror_id?.trim()) {
        contributorsXml += `            <affiliations>\n`;
        contributorsXml += `              <institution>\n`;
        if (author.affiliation?.trim()) {
          contributorsXml += `                <institution_name>${escapeXml(author.affiliation.trim())}</institution_name>\n`;
        }
        if (author.ror_id?.trim()) {
          contributorsXml += `                <institution_id type="ror">${escapeXml(author.ror_id.trim())}</institution_id>\n`;
        }
        contributorsXml += `              </institution>\n`;
        contributorsXml += `            </affiliations>\n`;
      }

      if (author.orcid) {
        const cleanOrcid = author.orcid.trim().replace(/^https?:\/\/orcid\.org\//, '');
        contributorsXml += `            <ORCID authenticated="false">https://orcid.org/${escapeXml(cleanOrcid)}</ORCID>\n`;
      }
      contributorsXml += `          </person_name>\n`;
    });
    contributorsXml += '        </contributors>';
  }

  // Abstract section (Crossref JATS abstract tag namespace)
  const abstractXml = escapedAbstract
    ? `        <abstract xmlns="http://www.ncbi.nlm.nih.gov/JATS1">\n          <p>${escapedAbstract}</p>\n        </abstract>\n`
    : '';

  // ISSN element
  const issnXml = escapedJournalIssn && escapedJournalIssn !== 'N/A'
    ? `        <issn media_type="electronic">${escapedJournalIssn}</issn>\n`
    : '';

  // Form Crossmark XML
  let crossmarkXml = '';
  try {
    const articleUrlObj = new URL(articleData.url);
    const domainHost = articleUrlObj.hostname;
    
    let policyDoi = '10.5555/opuspublica_crossmark_policy';
    if (articleData.doi.includes('/')) {
      const doiPrefix = articleData.doi.split('/')[0];
      policyDoi = `${doiPrefix}/opuspublica_crossmark_policy`;
    }

    crossmarkXml = `        <crossmark>
          <crossmark_version>1</crossmark_version>
          <crossmark_policy>${escapeXml(policyDoi)}</crossmark_policy>
          <crossmark_domains>
            <crossmark_domain>
              <domain>${escapeXml(domainHost)}</domain>
            </crossmark_domain>
          </crossmark_domains>
          <crossmark_domain_exclusive>false</crossmark_domain_exclusive>
        </crossmark>\n`;
  } catch (err) {
    console.error('Failed to generate Crossmark XML segment:', err);
  }

  // Form Funder XML
  let fundingXml = '';
  if (articleData.funderName?.trim()) {
    fundingXml = `        <fr:program name="fundref">\n`;
    fundingXml += `          <fr:assertion name="fundgroup">\n`;
    fundingXml += `            <fr:assertion name="funder_name">\n`;
    fundingXml += `              ${escapeXml(articleData.funderName.trim())}\n`;
    if (articleData.funderId?.trim()) {
      fundingXml += `              <fr:assertion name="funder_identifier">${escapeXml(articleData.funderId.trim())}</fr:assertion>\n`;
    }
    fundingXml += `            </fr:assertion>\n`;
    if (articleData.funderAwardNumber?.trim()) {
      fundingXml += `            <fr:assertion name="award_number">${escapeXml(articleData.funderAwardNumber.trim())}</fr:assertion>\n`;
    }
    fundingXml += `          </fr:assertion>\n`;
    fundingXml += `        </fr:program>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch version="5.3.1" xmlns="http://www.crossref.org/schema/5.3.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:fr="http://www.crossref.org/fundref.xsd" xsi:schemaLocation="http://www.crossref.org/schema/5.3.1 http://www.crossref.org/schemas/crossref5.3.1.xsd">
  <head>
    <doi_batch_id>${batchId}</doi_batch_id>
    <timestamp>${timestamp}</timestamp>
    <depositor>
      <depositor_name>Opus Publica</depositor_name>
      <email_address>admin@opuspublica.com</email_address>
    </depositor>
    <registrant>Advocacy Unified Network</registrant>
  </head>
  <body>
    <journal>
      <journal_metadata>
        <full_title>${escapedJournalName}</full_title>
${issnXml}      </journal_metadata>
      <journal_issue>
        <publication_date media_type="online">
          <year>${year}</year>
        </publication_date>
      </journal_issue>
      <journal_article publication_type="full_text">
        <titles>
          <title>${escapedTitle}</title>
        </titles>
        ${contributorsXml}
${abstractXml}        <publication_date media_type="online">
          <year>${year}</year>
          <month>${month}</month>
          <day>${day}</day>
        </publication_date>
${crossmarkXml}${fundingXml}        <doi_data>
          <doi>${escapedDoi}</doi>
          <resource>${escapedUrl}</resource>
        </doi_data>
      </journal_article>
    </journal>
  </body>
</doi_batch>`;
}

/**
 * Generates Crossref metadata deposit XML for Books (Monographs)
 */
export function generateBookCrossrefXml(bookData: {
  title: string;
  doi: string;
  url: string;
  publication_date?: string | null;
  isbn?: string | null;
  isbn_ebook?: string | null;
  authors: Array<{
    name: string;
    role?: string | null;
  }>;
}): string {
  const batchId = `deposit_${bookData.doi.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  const timestamp = Date.now();
  
  let year = '';
  if (bookData.publication_date) {
    const match = bookData.publication_date.match(/\d{4}/);
    if (match) {
      year = match[0];
    }
  }
  if (!year) {
    year = String(new Date().getFullYear());
  }

  const escapedTitle = escapeXml(bookData.title);
  const escapedDoi = escapeXml(bookData.doi);
  const escapedUrl = escapeXml(bookData.url);

  // Contributors XML
  let contributorsXml = '';
  if (bookData.authors && bookData.authors.length > 0) {
    contributorsXml = '    <contributors>\n';
    bookData.authors.forEach((author, index) => {
      const { given, surname } = splitName(author.name);
      const seq = index === 0 ? 'first' : 'additional';
      contributorsXml += `      <person_name sequence="${seq}" contributor_role="author">\n`;
      if (given) {
        contributorsXml += `        <given_name>${escapeXml(given)}</given_name>\n`;
      }
      contributorsXml += `        <surname>${escapeXml(surname)}</surname>\n`;
      contributorsXml += `      </person_name>\n`;
    });
    contributorsXml += '    </contributors>';
  }

  // ISBN XML
  let isbnXml = '';
  const cleanIsbn = bookData.isbn?.trim() || '';
  const cleanIsbnEbook = bookData.isbn_ebook?.trim() || '';

  if (cleanIsbn || cleanIsbnEbook) {
    if (cleanIsbn) {
      isbnXml += `    <isbn media_type="print">${escapeXml(cleanIsbn)}</isbn>\n`;
    }
    if (cleanIsbnEbook) {
      isbnXml += `    <isbn media_type="electronic">${escapeXml(cleanIsbnEbook)}</isbn>\n`;
    }
  } else {
    isbnXml += `    <noisbn reason="archive_volume"/>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch version="5.3.1" xmlns="http://www.crossref.org/schema/5.3.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:fr="http://www.crossref.org/fundref.xsd" xsi:schemaLocation="http://www.crossref.org/schema/5.3.1 http://www.crossref.org/schemas/crossref5.3.1.xsd">
  <head>
    <doi_batch_id>${batchId}</doi_batch_id>
    <timestamp>${timestamp}</timestamp>
    <depositor>
      <depositor_name>Opus Publica</depositor_name>
      <email_address>admin@opuspublica.com</email_address>
    </depositor>
    <registrant>Advocacy Unified Network</registrant>
  </head>
  <body>
    <book book_type="monograph">
      <book_metadata language="en">
        <titles><title>${escapedTitle}</title></titles>
        ${contributorsXml}
        <publication_date>
          <year>${year}</year>
        </publication_date>
        ${isbnXml.trim()}
        <publisher>
          <publisher_name>Opus Publica</publisher_name>
        </publisher>
        <doi_data>
          <doi>${escapedDoi}</doi>
          <resource>${escapedUrl}</resource>
        </doi_data>
      </book_metadata>
    </book>
  </body>
</doi_batch>`;
}
