export const handleEnterAsNewline = (
  event: React.KeyboardEvent<HTMLTextAreaElement>,
  currentValue: string,
  onChange: (newValue: string) => void,
  onCursorUpdate?: (position: number) => void
): void => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();

    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd } = textarea;

    // Insert newline at cursor position
    const newValue =
      currentValue.substring(0, selectionStart) +
      "\n" +
      currentValue.substring(selectionEnd);

    // Calculate new cursor position
    const newCursorPos = selectionStart + 1;

    // Call onChange first
    onChange(newValue);

    // Notify parent of desired cursor position
    if (onCursorUpdate) {
      onCursorUpdate(newCursorPos);
    }
  }
};
