import { format, formatDistanceToNow } from 'date-fns';

/**
 * Format file size in KB to human-readable string (KB or MB).
 */
export const formatFileSize = (sizeKB) => {
  if (sizeKB < 1024) {
    return `${sizeKB.toFixed(1)} KB`;
  }
  const sizeMB = sizeKB / 1024;
  return `${sizeMB.toFixed(1)} MB`;
};

/**
 * Format a ISO date string to a nice local date like "Oct 24, 2023"
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy');
  } catch (error) {
    return dateString;
  }
};

/**
 * Format a date string to a time ago string like "3 hours ago"
 */
export const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return dateString;
  }
};
