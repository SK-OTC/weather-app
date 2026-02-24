import * as exportService from '../services/exportService.js';

export async function exportData(req, res, next) {
  try {
    const format = exportService.validateFormat(req.query.format);
    const { locationName, startDate, endDate, limit } = req.query;
    const data = await exportService.getExportData({ locationName, startDate, endDate, limit });
    const [contentType, filename] = exportService.getContentTypeAndFilename(format);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);

    if (format === 'pdf') {
      const buffer = await exportService.toPDF(data);
      return res.send(buffer);
    }
    let body;
    if (format === 'json') body = exportService.toJSON(data);
    else if (format === 'csv') body = exportService.toCSV(data);
    else body = exportService.toMarkdown(data);
    res.send(body);
  } catch (e) {
    next(e);
  }
}
