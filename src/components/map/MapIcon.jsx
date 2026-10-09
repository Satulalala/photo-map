const paths = {
  search: 'm21 21-4.4-4.4M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',
  locate: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3',
  refresh: 'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  heatmap: 'M12 3c1 5 5 5 5 10a5 5 0 0 1-10 0c0-2 1-4 2-5 0 3 1 4 2 4 2-2 2-5 1-9Z',
  life: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM16 8l-2.5 5.5L8 16l2.5-5.5L16 8ZM12 12h.01',
  settings:
    'M12.00 4.00L14.59 2.34L17.00 3.34L17.66 6.34L18.93 8.00L21.66 9.41L22.00 12.00L19.73 14.07L18.93 16.00L19.07 19.07L17.00 20.66L14.07 19.73L12.00 20.00L9.41 21.66L7.00 20.66L6.34 17.66L5.07 16.00L2.34 14.59L2.00 12.00L4.27 9.93L5.07 8.00L4.93 4.93L7.00 3.34L9.93 4.27ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
  photo: 'M4 4h16v16H4V4Zm0 12 5-5 4 4 3-3 4 4M16 8h.01',
  pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  close: 'm6 6 12 12M6 18 18 6',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2',
  restaurant: 'M7 3v8m-3-4h6M5 3v18m9-12V3m0 6c0 2 1 3 3 3v9',
  hotel: 'M4 18V6m0 8h16v4M8 14V9h5a3 3 0 0 1 3 3v2M4 18v3m16-3v3',
  park: 'M12 21V11m0 0c-3 0-5-2-5-5 3 0 5 2 5 5Zm0 0c3 0 5-2 5-5-3 0-5 2-5 5Z',
  medical: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-4-9h8m-4-4v8',
  school: 'm3 9 9-5 9 5-9 5-9-5Zm3 3v5c3 2 9 2 12 0v-5M12 14v7',
  shopping: 'M4 6h16l-1 13H5L4 6Zm4 0a4 4 0 0 1 8 0',
  transit: 'M6 16h12M7 19h.01M17 19h.01M6 16l-1-9h14l-1 9M8 7V4h8v3',
  bank: 'm3 10 9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18',
  government: 'm3 10 9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18',
  home: 'm3 11 9-8 9 8v9H3v-9Zm6 9v-5h6v5',
  office: 'M5 21V4h10v17M15 9h4v12M8 8h3m-3 4h3m-3 4h3M2 21h20',
  map: 'M4 5 10 3l4 2 6-2v16l-6 2-4-2-6 2V5Zm6-2v16m4-14v16',
  user: 'M20 21a8 8 0 0 0-16 0M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  palette:
    'M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h4a5 5 0 0 0 0-10H12ZM7 10h.01M9 7h.01M15 7h.01',
  performance: 'M4 19h16M6 16v-4m4 4V8m4 8v-6m4 6V5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6m0-10h.01',
  trash: 'M5 7h14m-9 4v6m4-6v6M9 7V4h6v3m-9 0 1 14h10l1-14',
  ruler: 'm4 17 13-13 3 3L7 20H4v-3Zm5-5 3 3m-1-7 3 3m-1-7 3 3',
  download: 'M12 3v12m0 0 5-5m-5 5-5-5M4 21h16',
  logout: 'M10 17l5-5-5-5m5 5H3m9-9V3h9v18h-9v-3',
  check: 'm5 12 4 4L19 6',
  chevron: 'm8 10 4 4 4-4',
  layers: 'm12 3 10 6-10 6L2 9l10-6ZM2 13l10 6 10-6M2 17l10 6 10-6',
  edit: 'm16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5',
  star: 'm12 3 3 6 6 1-4.5 4.5L18 21l-6-3-6 3 1.5-6.5L3 10l6-1 3-6Z',
  left: 'm15 5-7 7 7 7',
  right: 'm9 5 7 7-7 7',
  rotateLeft: 'M4 9a8 8 0 1 1 0 6M4 3v6h6',
  rotateRight: 'M20 9a8 8 0 1 0 0 6M20 3v6h-6',
  crop: 'M7 3v14h14M3 7h14v14',
  link: 'm9 15 6-6M8 13l-2 2a3 3 0 0 0 4 4l3-3M11 8l3-3a3 3 0 0 1 4 4l-2 2',
  mail: 'M3 5h18v14H3V5Zm0 0 9 7 9-7',
};

export default function MapIcon({ name, className = '' }) {
  return (
    <svg
      className={`map-icon ${className}`}
      data-icon={name}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name] || paths.pin} />
    </svg>
  );
}
