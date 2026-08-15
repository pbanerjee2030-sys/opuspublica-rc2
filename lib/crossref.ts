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
 * Generates Crossref metadata deposit XML for Journal Articles
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
    orcid_authenticated?: boolean | null;
    affiliation?: string | null;
    ror_id?: string | null;
  }>;
  funderName?: string | null;
  funderAwardNumber?: string | null;
  funderId?: string | null;
  ror?: string | null;
  grantDoi?: string | null;
}): string {
  const batchId = `deposit_${articleData.doi.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  const timestamp = Date.now();
  const pubDate = new Date(articleData.publishedAt);
  const year = pubDate.getFullYear();
  const month = String(pubDate.getMonth() + 1).padStart(2, '0');
  const day = String(pubDate.getDate()).padStart(2, '0');

  const escapedTitle = escapeXml(articleData.title);
  const escapedAbstract = articleData.abstract ? escapeXml(articleData.abstract) : '';
  const escapedJournalName = escapeXml(articleData.journalName);
  const escapedJournalIssn = articleData.journalIssn ? escapeXml(articleData.journalIssn) : '';
  const escapedDoi = escapeXml(articleData.doi);
  const escapedUrl = escapeXml(articleData.url);

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
        const authFlag = author.orcid_authenticated ? 'true' : 'false';
        contributorsXml += `            <ORCID authenticated="${authFlag}">https://orcid.org/${escapeXml(cleanOrcid)}</ORCID>\n`;
      }
      contributorsXml += `          </person_name>\n`;
    });
    contributorsXml += '        </contributors>';
  }

  const abstractXml = escapedAbstract
    ? `        <abstract xmlns="http://www.ncbi.nlm.nih.gov/JATS1">\n          <p>${escapedAbstract}</p>\n        </abstract>\n`
    : '';

  const issnXml = escapedJournalIssn && escapedJournalIssn !== 'N/A'
    ? `        <issn media_type="electronic">${escapedJournalIssn}</issn>\n`
    : '';

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

  let fundingXml = '';
  if (articleData.funderName?.trim()) {
    fundingXml = `        <fr:program name="fundref">\n`;
    fundingXml += `          <fr:assertion name="fundgroup">\n`;
    fundingXml += `            <fr:assertion name="funder_name">\n`;
    fundingXml += `              ${escapeXml(articleData.funderName.trim())}\n`;
    if (articleData.ror?.trim()) {
      fundingXml += `              <fr:assertion name="ror">${escapeXml(articleData.ror.trim())}</fr:assertion>\n`;
    }
    if (articleData.funderId?.trim()) {
      fundingXml += `              <fr:assertion name="funder_identifier">${escapeXml(articleData.funderId.trim())}</fr:assertion>\n`;
    }
    fundingXml += `            </fr:assertion>\n`;
    if (articleData.funderAwardNumber?.trim()) {
      fundingXml += `            <fr:assertion name="award_number">${escapeXml(articleData.funderAwardNumber.trim())}</fr:assertion>\n`;
    }
    if (articleData.grantDoi?.trim()) {
      fundingXml += `            <fr:assertion name="grant_doi">${escapeXml(articleData.grantDoi.trim())}</fr:assertion>\n`;
    }
    fundingXml += `          </fr:assertion>\n`;
    fundingXml += `        </fr:program>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch version="5.5.0" xmlns="http://www.crossref.org/schema/5.5.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:fr="http://www.crossref.org/fundref.xsd" xmlns:ai="http://www.crossref.org/AccessIndicators.xsd" xsi:schemaLocation="http://www.crossref.org/schema/5.5.0 http://www.crossref.org/schemas/crossref5.5.0.xsd">
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
          <month>${month}</month>
          <day>${day}</day>
          <year>${year}</year>
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
    orcid?: string | null;
    orcid_authenticated?: boolean | null;
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
      if (author.orcid) {
        const cleanOrcid = author.orcid.trim().replace(/^https?:\/\/orcid\.org\//, '');
        const authFlag = author.orcid_authenticated ? 'true' : 'false';
        contributorsXml += `        <ORCID authenticated="${authFlag}">https://orcid.org/${escapeXml(cleanOrcid)}</ORCID>\n`;
      }
      contributorsXml += `      </person_name>\n`;
    });
    contributorsXml += '    </contributors>';
  }

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
<doi_batch version="5.5.0" xmlns="http://www.crossref.org/schema/5.5.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:fr="http://www.crossref.org/fundref.xsd" xmlns:ai="http://www.crossref.org/AccessIndicators.xsd" xsi:schemaLocation="http://www.crossref.org/schema/5.5.0 http://www.crossref.org/schemas/crossref5.5.0.xsd">
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
${contributorsXml ? contributorsXml + '\n        ' : ''}<titles><title>${escapedTitle}</title></titles>
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

export interface ReportCrossrefMetadata {
  title: string;
  abstract?: string | null;
  doi: string;
  url: string; // resource URL
  publishedAt: string; // Used as online publication date
  historicalPublishedAt?: string | null; // series or print publication date
  seriesTitle?: string | null;
  seriesNumber?: string | null;
  issn?: string | null;
  volume?: string | null;
  version?: string | null;
  publisherName: string;
  institutionName?: string | null;
  authors: Array<{
    full_name: string;
    orcid?: string | null;
    orcid_authenticated?: boolean | null;
    affiliation?: string | null;
    ror_id?: string | null;
  }>;
  funderName?: string | null;
  funderAwardNumber?: string | null;
  funderId?: string | null;
  ror?: string | null;
  grantDoi?: string | null;
  licenseUrl?: string | null;
  crossmarkPolicyDoi?: string | null;
  crossmarkDomain?: string | null;
  references?: Array<{
    key: string;
    doi?: string | null;
    unstructured?: string | null;
  }>;
}

/**
 * Generates Crossref metadata deposit XML for Reports / Working Papers
 */
export function generateReportCrossrefXml(reportData: ReportCrossrefMetadata): string {
  // Validation: Prevent placeholder URLs
  const invalidDomains = ['example.com', 'example.org', 'localhost'];
  if (invalidDomains.some(domain => reportData.url.includes(domain))) {
    throw new Error(`Invalid resource URL: Placeholder domains like example.com are not permitted for production deposits.`);
  }

  // Validation: Series MUST have ISSN
  if (reportData.seriesTitle?.trim() && !reportData.issn?.trim()) {
    throw new Error(`missing authoritative ISSN for series`);
  }

  // Validation: DOI format
  if (!reportData.doi.startsWith("10.")) {
    throw new Error(`Invalid DOI format: Must start with 10.`);
  }

  // Validation: ROR format
  if (reportData.ror?.trim() && !reportData.ror.startsWith("https://ror.org/")) {
    throw new Error(`Invalid ROR format: Must start with https://ror.org/`);
  }

  const batchId = `deposit_${reportData.doi.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
  const timestamp = Date.now();
  
  const pubDateOnline = new Date(reportData.publishedAt);
  const yearOnline = pubDateOnline.getFullYear();
  const monthOnline = String(pubDateOnline.getMonth() + 1).padStart(2, "0");
  const dayOnline = String(pubDateOnline.getDate()).padStart(2, "0");

  let historicalXml = "";
  if (reportData.historicalPublishedAt) {
    const pubDateHist = new Date(reportData.historicalPublishedAt);
    const yearHist = pubDateHist.getFullYear();
    const monthHist = String(pubDateHist.getMonth() + 1).padStart(2, "0");
    const dayHist = String(pubDateHist.getDate()).padStart(2, "0");
    historicalXml = `        <publication_date media_type="print">\n          <month>${monthHist}</month>\n          <day>${dayHist}</day>\n          <year>${yearHist}</year>\n        </publication_date>\n`;
  }

  const escapedTitle = escapeXml(reportData.title);
  const escapedAbstract = reportData.abstract ? escapeXml(reportData.abstract) : "";
  const escapedDoi = escapeXml(reportData.doi);
  const escapedUrl = escapeXml(reportData.url);
  const escapedPublisher = escapeXml(reportData.publisherName);
  
  // Contributors XML
  let contributorsXml = "";
  if (reportData.authors && reportData.authors.length > 0) {
    contributorsXml = "        <contributors>\n";
    reportData.authors.forEach((author, index) => {
      const { given, surname } = splitName(author.full_name);
      const seq = index === 0 ? "first" : "additional";
      contributorsXml += `          <person_name sequence="${seq}" contributor_role="author">\n`;
      if (given) {
        contributorsXml += `            <given_name>${escapeXml(given)}</given_name>\n`;
      }
      contributorsXml += `            <surname>${escapeXml(surname)}</surname>\n`;
      
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
        const cleanOrcid = author.orcid.trim().replace(/^https?:\/\/orcid\.org\//, "");
        const authFlag = author.orcid_authenticated ? 'true' : 'false';
        contributorsXml += `            <ORCID authenticated="${authFlag}">https://orcid.org/${escapeXml(cleanOrcid)}</ORCID>\n`;
      }
      contributorsXml += `          </person_name>\n`;
    });
    contributorsXml += "        </contributors>\n";
  }

  // Abstract section
  const abstractXml = escapedAbstract
    ? `        <abstract xmlns="http://www.ncbi.nlm.nih.gov/JATS1">\n          <p>${escapedAbstract}</p>\n        </abstract>\n`
    : "";

  // Crossmark, Funding, and License Logic
  // According to Crossref schema 5.5.0, if <crossmark> is used, <fr:program> and <ai:program> MUST be nested inside <custom_metadata>.
  let fundingXml = "";
  if (reportData.funderName?.trim()) {
    fundingXml += `        <fr:program name="fundref">\n`;
    fundingXml += `          <fr:assertion name="fundgroup">\n`;
    fundingXml += `            <fr:assertion name="funder_name">\n`;
    fundingXml += `              ${escapeXml(reportData.funderName.trim())}\n`;
    if (reportData.ror?.trim()) {
      fundingXml += `              <fr:assertion name="ror">${escapeXml(reportData.ror.trim())}</fr:assertion>\n`;
    }
    if (reportData.funderId?.trim()) {
      fundingXml += `              <fr:assertion name="funder_identifier">${escapeXml(reportData.funderId.trim())}</fr:assertion>\n`;
    }
    fundingXml += `            </fr:assertion>\n`;
    if (reportData.funderAwardNumber?.trim()) {
      fundingXml += `            <fr:assertion name="award_number">${escapeXml(reportData.funderAwardNumber.trim())}</fr:assertion>\n`;
    }
    if (reportData.grantDoi?.trim()) {
      fundingXml += `            <fr:assertion name="grant_doi">${escapeXml(reportData.grantDoi.trim())}</fr:assertion>\n`;
    }
    fundingXml += `          </fr:assertion>\n`;
    fundingXml += `        </fr:program>\n`;
  }

  let licenseXml = "";
  if (reportData.licenseUrl?.trim()) {
    licenseXml += `        <ai:program name="AccessIndicators">\n`;
    licenseXml += `          <ai:license_ref>${escapeXml(reportData.licenseUrl.trim())}</ai:license_ref>\n`;
    licenseXml += `        </ai:program>\n`;
  }

  let finalProgramsXml = "";
  if (reportData.crossmarkPolicyDoi || reportData.crossmarkDomain) {
    const policyDoi = reportData.crossmarkPolicyDoi || `${reportData.doi.split('/')[0]}/opuspublica_crossmark_policy`;
    const domain = reportData.crossmarkDomain || new URL(reportData.url).hostname;
    
    finalProgramsXml += `        <crossmark>\n`;
    finalProgramsXml += `          <crossmark_version>1</crossmark_version>\n`;
    finalProgramsXml += `          <crossmark_policy>${escapeXml(policyDoi)}</crossmark_policy>\n`;
    finalProgramsXml += `          <crossmark_domains>\n`;
    finalProgramsXml += `            <crossmark_domain>\n`;
    finalProgramsXml += `              <domain>${escapeXml(domain)}</domain>\n`;
    finalProgramsXml += `            </crossmark_domain>\n`;
    finalProgramsXml += `          </crossmark_domains>\n`;
    finalProgramsXml += `          <crossmark_domain_exclusive>false</crossmark_domain_exclusive>\n`;
    if (fundingXml || licenseXml) {
      finalProgramsXml += `          <custom_metadata>\n`;
      finalProgramsXml += fundingXml;
      finalProgramsXml += licenseXml;
      finalProgramsXml += `          </custom_metadata>\n`;
    }
    finalProgramsXml += `        </crossmark>\n`;
  } else {
    finalProgramsXml += fundingXml;
    finalProgramsXml += licenseXml;
  }

  // Version maps to edition_number
  let editionNumberXml = "";
  if (reportData.version?.trim()) {
    editionNumberXml = `        <edition_number>${escapeXml(reportData.version.trim())}</edition_number>\n`;
  }

  // Institution
  let institutionXml = "";
  if (reportData.institutionName?.trim()) {
    institutionXml = `        <institution>\n          <institution_name>${escapeXml(reportData.institutionName.trim())}</institution_name>\n        </institution>\n`;
  }

  // Citation List
  let citationListXml = "";
  if (reportData.references && reportData.references.length > 0) {
    citationListXml = `        <citation_list>\n`;
    reportData.references.forEach((ref) => {
      citationListXml += `          <citation key="${escapeXml(ref.key)}">\n`;
      if (ref.doi) {
        citationListXml += `            <doi>${escapeXml(ref.doi)}</doi>\n`;
      }
      if (ref.unstructured) {
        citationListXml += `            <unstructured_citation>${escapeXml(ref.unstructured)}</unstructured_citation>\n`;
      }
      citationListXml += `          </citation>\n`;
    });
    citationListXml += `        </citation_list>\n`;
  }

  // Base report metadata components
  const titlesXml = `        <titles><title>${escapedTitle}</title></titles>\n`;
  const pubDateOnlineXml = `        <publication_date media_type="online">\n          <month>${monthOnline}</month>\n          <day>${dayOnline}</day>\n          <year>${yearOnline}</year>\n        </publication_date>\n`;
  const publisherXml = `        <publisher>\n          <publisher_name>${escapedPublisher}</publisher_name>\n        </publisher>\n`;
  const doiDataXml = `        <doi_data>\n          <doi>${escapedDoi}</doi>\n          <resource>${escapedUrl}</resource>\n        </doi_data>\n`;

  let innerContent = "";

  if (reportData.seriesTitle?.trim() || reportData.issn?.trim()) {
    // report-paper_series_metadata path
    let seriesMetadataXml = `        <series_metadata>\n`;
    if (reportData.seriesTitle?.trim()) {
      seriesMetadataXml += `          <titles><title>${escapeXml(reportData.seriesTitle.trim())}</title></titles>\n`;
    }
    if (reportData.issn?.trim()) {
      seriesMetadataXml += `          <issn>${escapeXml(reportData.issn.trim())}</issn>\n`;
    }
    if (reportData.seriesNumber?.trim()) {
      seriesMetadataXml += `          <series_number>${escapeXml(reportData.seriesNumber.trim())}</series_number>\n`;
    }
    seriesMetadataXml += `        </series_metadata>\n`;

    let volumeXml = "";
    if (reportData.volume?.trim()) {
      volumeXml = `        <volume>${escapeXml(reportData.volume.trim())}</volume>\n`;
    }

    innerContent = `      <report-paper_series_metadata>\n` +
      seriesMetadataXml +
      contributorsXml +
      titlesXml +
      abstractXml +
      volumeXml +
      editionNumberXml +
      historicalXml +
      pubDateOnlineXml +
      publisherXml +
      institutionXml +
      finalProgramsXml +
      doiDataXml +
      citationListXml +
      `      </report-paper_series_metadata>\n`;
  } else {
    // report-paper_metadata path
    innerContent = `      <report-paper_metadata>\n` +
      contributorsXml +
      titlesXml +
      editionNumberXml +
      abstractXml +
      historicalXml +
      pubDateOnlineXml +
      publisherXml +
      institutionXml +
      finalProgramsXml +
      doiDataXml +
      citationListXml +
      `      </report-paper_metadata>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch version="5.5.0" xmlns="http://www.crossref.org/schema/5.5.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:fr="http://www.crossref.org/fundref.xsd" xmlns:ai="http://www.crossref.org/AccessIndicators.xsd" xsi:schemaLocation="http://www.crossref.org/schema/5.5.0 http://www.crossref.org/schemas/crossref5.5.0.xsd">
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
    <report-paper>
${innerContent}    </report-paper>
  </body>
</doi_batch>`;
}
