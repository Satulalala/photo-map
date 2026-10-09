import React, { Suspense, lazy } from "react";

const PhotoEditor = lazy(() => import("./PhotoEditor.jsx"));

export default function LazyPhotoEditor(props) {
  if (!props.photoEditor) return null;
  return (
    <Suspense fallback={null}>
      <PhotoEditor {...props} />
    </Suspense>
  );
}
