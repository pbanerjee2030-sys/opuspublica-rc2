import { describe, it, expect } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { generateCrossrefXml, generateReportCrossrefXml, generateBookCrossrefXml } from "../lib/crossref";
import { execSync } from "child_process";
import * as fs from "fs";

function parseXml(xmlString: string) {
  const parser = new DOMParser({
    errorHandler: {
      warning: () => {},
      error: (msg) => { throw new Error(msg); },
      fatalError: (msg) => { throw new Error(msg); },
    }
  });
  return parser.parseFromString(xmlString, "text/xml");
}

describe("Crossref XML Generators (5.5.0) - 20 Case Test Matrix", () => {
  const XSD_NAMESPACE = "http://www.crossref.org/schema/5.5.0";
  const baseReport = {
    title: "From Diagnosis to Delivery",
    doi: "10.62692/aun.gp.sdgaccel.2026",
    url: "https://opuspublica.org/gp/sdgaccel",
    publishedAt: "2026-08-15T12:00:00Z",
    publisherName: "Opus Publica",
    authors: [{ full_name: "Victor Samuel" }]
  };

  it("1. Journal article", () => {
    const xml = generateCrossrefXml({
      title: "Test Article",
      doi: "10.62692/test.123",
      url: "https://opuspublica.org/article",
      publishedAt: "2026-08-14T23:08:32Z",
      journalName: "Test Journal",
      authors: [{ full_name: "John Doe", orcid: "0000-0002-1825-0097", orcid_authenticated: true }]
    });
    const doc = parseXml(xml);
    expect(doc.documentElement.tagName).toBe("doi_batch");
    expect(doc.getElementsByTagName("journal_article").length).toBe(1);
  });

  it("2. Book", () => {
    const xml = generateBookCrossrefXml({
      title: "Test Book",
      doi: "10.62692/test.book",
      url: "https://opuspublica.org/book",
      publication_date: "2026-08-14T00:00:00Z",
      isbn: "978-3-16-148410-0",
      authors: [{ name: "Jane Smith", orcid: "0000-0002-1825-0098", orcid_authenticated: false }]
    });
    const doc = parseXml(xml);
    expect(doc.getElementsByTagName("book")[0].getAttribute("book_type")).toBe("monograph");
  });

  it("3. Report outside a series", () => {
    const xml = generateReportCrossrefXml(baseReport);
    const doc = parseXml(xml);
    expect(doc.getElementsByTagName("report-paper").length).toBe(1);
    expect(doc.getElementsByTagName("report-paper_series_metadata").length).toBe(0);
  });

  it("4. Report inside a series & 5. Series with ISSN & 7. Series number", () => {
    const xml = generateReportCrossrefXml({
      ...baseReport,
      seriesTitle: "Global Perspectives",
      issn: "2325-1234",
      seriesNumber: "2026-01"
    });
    const doc = parseXml(xml);
    const seriesMeta = doc.getElementsByTagName("report-paper_series_metadata")[0];
    expect(seriesMeta).toBeDefined();
    expect(doc.getElementsByTagName("issn")[0].textContent).toBe("2325-1234");
    expect(doc.getElementsByTagName("series_number")[0].textContent).toBe("2026-01");
  });

  it("6. Series without ISSN (throws)", () => {
    expect(() => generateReportCrossrefXml({
      ...baseReport,
      seriesTitle: "Global Perspectives"
    })).toThrow("missing authoritative ISSN for series");
  });

  it("8. Publisher & 9. Institution", () => {
    const xml = generateReportCrossrefXml({
      ...baseReport,
      publisherName: "Publisher A",
      institutionName: "Institution B"
    });
    const doc = parseXml(xml);
    expect(doc.getElementsByTagName("publisher_name")[0].textContent).toBe("Publisher A");
    expect(doc.getElementsByTagName("institution_name")[0].textContent).toBe("Institution B");
  });

  it("10. ROR funder & 11. Open Funder Registry funder identifier", () => {
    const xml = generateReportCrossrefXml({
      ...baseReport,
      funderName: "Advocacy Unified Network",
      ror: "https://ror.org/03nkv4177",
      funderId: "10.13039/123456789",
      funderAwardNumber: "AUN-2026-01"
    });
    const doc = parseXml(xml);
    const program = doc.getElementsByTagName("fr:program")[0];
    const assertions = Array.from(program.getElementsByTagName("fr:assertion"));
    expect(assertions.find(a => a.getAttribute("name") === "ror")?.textContent).toBe("https://ror.org/03nkv4177");
    expect(assertions.find(a => a.getAttribute("name") === "funder_identifier")?.textContent).toBe("10.13039/123456789");
  });

  it("12. Authenticated ORCID & 13. Unauthenticated ORCID", () => {
    const xml = generateReportCrossrefXml({
      ...baseReport,
      authors: [
        { full_name: "Victor Samuel", orcid: "0009-0002-4823-962X", orcid_authenticated: true },
        { full_name: "Francisca Oliviera", orcid: "0009-0002-1103-7725", orcid_authenticated: false }
      ]
    });
    const doc = parseXml(xml);
    const orcids = doc.getElementsByTagName("ORCID");
    expect(orcids[0].getAttribute("authenticated")).toBe("true");
    expect(orcids[1].getAttribute("authenticated")).toBe("false");
  });

  it("14. License", () => {
    const xml = generateReportCrossrefXml({
      ...baseReport,
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/"
    });
    const doc = parseXml(xml);
    const license = doc.getElementsByTagName("ai:license_ref")[0];
    expect(license.textContent).toBe("https://creativecommons.org/licenses/by/4.0/");
  });

  it("15. References", () => {
    const xml = generateReportCrossrefXml({
      ...baseReport,
      references: [{ key: "ref1", doi: "10.1234/test" }]
    });
    const doc = parseXml(xml);
    expect(doc.getElementsByTagName("citation")[0].getAttribute("key")).toBe("ref1");
  });

  it("16. Missing required metadata URL validation", () => {
    expect(() => generateReportCrossrefXml({
      ...baseReport,
      url: "https://example.com/test"
    })).toThrow("Placeholder domains like example.com are not permitted");
  });

  it("17. Invalid DOI", () => {
    expect(() => generateReportCrossrefXml({
      ...baseReport,
      doi: "invalid.doi"
    })).toThrow("Invalid DOI format");
  });

  it("18. Invalid ROR", () => {
    expect(() => generateReportCrossrefXml({
      ...baseReport,
      ror: "http://example.com/ror"
    })).toThrow("Invalid ROR format");
  });

  it("20. Historical/online date separation", () => {
    const xml = generateReportCrossrefXml({
      ...baseReport,
      historicalPublishedAt: "2025-01-01T00:00:00Z"
    });
    const doc = parseXml(xml);
    const pubDates = Array.from(doc.getElementsByTagName("publication_date"));
    expect(pubDates.find(p => p.getAttribute("media_type") === "print")?.getElementsByTagName("year")[0].textContent).toBe("2025");
    expect(pubDates.find(p => p.getAttribute("media_type") === "online")?.getElementsByTagName("year")[0].textContent).toBe("2026");
  });

  it("19. Real XSD validation (via python script) including legacy fixes", () => {
    // Generate valid XML containing all complex features (fundref, crossmark, etc)
    const xml = generateReportCrossrefXml({
      ...baseReport,
      seriesTitle: "Global Perspectives",
      issn: "2325-1234",
      seriesNumber: "2026-01",
      version: "1.0",
      historicalPublishedAt: "2025-01-01T00:00:00Z",
      funderName: "Advocacy Unified Network",
      ror: "https://ror.org/03nkv4177",
      funderAwardNumber: "AUN-2026-01",
      crossmarkDomain: "opuspublica.org",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      authors: [
        { full_name: "Victor Samuel", orcid: "0009-0002-4823-962X", orcid_authenticated: true },
        { full_name: "Francisca Oliviera", orcid: "0009-0002-1103-7725", orcid_authenticated: false, ror_id: "https://ror.org/03nkv4177", affiliation: "AUN" }
      ],
      references: [{ key: "ref1", doi: "10.1234/test", unstructured: "Ref 1 text" }]
    });

    const journalXml = generateCrossrefXml({
      title: "Test Article",
      doi: "10.62692/test.123",
      url: "https://opuspublica.org/article",
      publishedAt: "2026-08-14T23:08:32Z",
      journalName: "Test Journal",
      authors: [{ full_name: "John Doe" } as any]
    });

    const bookXml = generateBookCrossrefXml({
      title: "Test Book",
      doi: "10.62692/test.book",
      url: "https://opuspublica.org/book",
      publication_date: "2026-08-14T00:00:00Z",
      isbn: "978-3-16-148410-0",
      authors: [{ name: "Jane Smith" } as any]
    });

    const tmpFile = "tests/tmp_xsd_validation.xml";
    const tmpJournalFile = "tests/tmp_xsd_journal.xml";
    const tmpBookFile = "tests/tmp_xsd_book.xml";
    fs.writeFileSync(tmpFile, xml);
    fs.writeFileSync(tmpJournalFile, journalXml);
    fs.writeFileSync(tmpBookFile, bookXml);

    try {
      // Execute the python validation script
      const output = execSync(`python tests/validate_xsd.py ${tmpFile}`).toString();
      expect(output).toContain("Validation successful!");

      const journalOutput = execSync(`python tests/validate_xsd.py ${tmpJournalFile}`).toString();
      expect(journalOutput).toContain("Validation successful!");

      const bookOutput = execSync(`python tests/validate_xsd.py ${tmpBookFile}`).toString();
      expect(bookOutput).toContain("Validation successful!");
    } finally {
      // fs.unlinkSync(tmpFile);
    }
  });
});
