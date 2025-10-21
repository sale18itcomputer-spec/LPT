/**
 * Escapes a value for CSV format by wrapping it in double quotes if it contains a comma,
 * and escaping any existing double quotes by doubling them.
 * @param value The value to escape.
 * @returns The CSV-safe string.
 */
const escapeCsvValue = (value: any): string => {
    // FIX: Explicitly handle number types to prevent them from being treated as objects.
    if (typeof value === 'number') {
        return String(value);
    }
    const stringValue = String(value ?? ''); // Handle null/undefined
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};


/**
 * Converts an array of objects to a CSV string and triggers a browser download.
 * @param data The array of objects to export.
 * @param headers An array of header objects with label and key.
 * @param filename The desired name for the downloaded file.
 */
export const exportDataToCsv = (data: any[], headers: { label: string; key: string }[], filename: string) => {
    if (!data.length) {
        console.warn("No data to export.");
        return;
    }

    const headerRow = headers.map(h => escapeCsvValue(h.label)).join(',');

    const dataRows = data.map(row => {
        return headers.map(header => escapeCsvValue(row[header.key])).join(',');
    });

    const csvContent = [headerRow, ...dataRows].join('\n');
    
    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};