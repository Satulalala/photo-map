import React, { Suspense, lazy } from "react";

const PhotoViewer = lazy(() => import("./PhotoViewer.jsx"));

export default function LazyPhotoViewer(props) {
  if (!props.photoViewer) return null;
  return (
    <Suspense fallback={null}>
      <PhotoViewer {...props} />
    </Suspense>
  );
}
