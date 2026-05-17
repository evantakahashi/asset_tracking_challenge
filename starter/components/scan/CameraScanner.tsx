"use client";
export function CameraScanner({
  onDecoded: _onDecoded,
  onClose,
}: {
  onDecoded: (value: string) => void;
  onClose: () => void;
}): React.ReactElement {
  return <div onClick={onClose}>Camera (stub)</div>;
}
