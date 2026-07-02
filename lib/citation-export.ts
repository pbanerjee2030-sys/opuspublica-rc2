export interface CitationData {
  title: string;
  authors: string[];
  journalName: string;
  publishDate: string;
  doi?: string | null;
  abstract?: string | null;
}

export function toBibTeX(article: CitationData): string {
  const year = new Date(article.publishDate).getFullYear();
  const month = new Date(article.publishDate).toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
  const firstAuthorKey = article.authors[0]?.split(' ').pop()?.toLowerCase() || 'unknown';
  const authorStr = article.authors.join(' and ');

  let bibtex = `@article{${firstAuthorKey}${year},
  title = {${article.title}},
  author = {${authorStr}},
  journal = {${article.journalName}},
  year = {${year}},
  month = {${month}}`;

  if (article.doi) {
    bibtex += `,\n  doi = {${article.doi}}`;
    bibtex += `,\n  url = {https://doi.org/${article.doi}}`;
  }

  if (article.abstract) {
    bibtex += `,\n  abstract = {${article.abstract.replace(/\n/g, ' ').substring(0, 500)}}`;
  }

  bibtex += '\n}';
  return bibtex;
}

export function toRIS(article: CitationData): string {
  const year = new Date(article.publishDate).getFullYear();
  const month = String(new Date(article.publishDate).getMonth() + 1).padStart(2, '0');
  const day = String(new Date(article.publishDate).getDate()).padStart(2, '0');

  let ris = 'TY  - JOUR\n';
  ris += `TI  - ${article.title}\n`;

  article.authors.forEach((a) => {
    ris += `AU  - ${a}\n`;
  });

  ris += `JO  - ${article.journalName}\n`;
  ris += `PY  - ${year}\n`;
  ris += `DA  - ${year}/${month}/${day}\n`;

  if (article.doi) {
    ris += `DO  - ${article.doi}\n`;
    ris += `UR  - https://doi.org/${article.doi}\n`;
  }

  if (article.abstract) {
    ris += `AB  - ${article.abstract}\n`;
  }

  ris += 'ER  - \n';
  return ris;
}

export function toEndNote(article: CitationData): string {
  const year = new Date(article.publishDate).getFullYear();
  const month = String(new Date(article.publishDate).getMonth() + 1).padStart(2, '0');
  const day = String(new Date(article.publishDate).getDate()).padStart(2, '0');

  let enl = '%0 Journal Article\n';
  enl += `%T ${article.title}\n`;

  article.authors.forEach((a) => {
    enl += `%A ${a}\n`;
  });

  enl += `%J ${article.journalName}\n`;
  enl += `%D ${year}\n`;
  enl += `%8 ${year}-${month}-${day}\n`;

  if (article.doi) {
    enl += `%R ${article.doi}\n`;
    enl += `%U https://doi.org/${article.doi}\n`;
  }

  if (article.abstract) {
    enl += `%X ${article.abstract}\n`;
  }

  enl += `%M OPUS-${article.title.substring(0, 20).replace(/\s+/g, '-')}\n`;
  return enl;
}
