/**
 * Clipboard utility for copying text to clipboard
 * Uses modern Clipboard API with fallback for older browsers
 */

export async function copyToClipboard(text: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Try modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return { success: true };
    }

    // Fallback for older browsers or non-secure contexts
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        return { success: true };
      } else {
        return { success: false, error: 'Copy command failed' };
      }
    } catch (err) {
      document.body.removeChild(textArea);
      throw err;
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to copy to clipboard',
    };
  }
}

