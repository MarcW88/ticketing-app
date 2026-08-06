'use client';

// Deterministic ember data — no Math.random() to avoid hydration mismatch
const EMBERS = [
  { id: 0,  left: 8,  bottom: 12, size: 2.8, delay: 0.0,  duration: 9.2,  dx:  55, dx2: -30 },
  { id: 1,  left: 15, bottom: 5,  size: 1.6, delay: 1.4,  duration: 7.8,  dx: -40, dx2:  20 },
  { id: 2,  left: 22, bottom: 18, size: 3.2, delay: 2.8,  duration: 11.0, dx:  30, dx2: -50 },
  { id: 3,  left: 31, bottom: 8,  size: 1.9, delay: 0.7,  duration: 8.5,  dx: -60, dx2:  35 },
  { id: 4,  left: 38, bottom: 22, size: 2.4, delay: 3.5,  duration: 10.2, dx:  45, dx2: -25 },
  { id: 5,  left: 45, bottom: 4,  size: 1.4, delay: 5.1,  duration: 7.4,  dx: -35, dx2:  55 },
  { id: 6,  left: 52, bottom: 15, size: 3.0, delay: 1.9,  duration: 9.8,  dx:  65, dx2: -40 },
  { id: 7,  left: 59, bottom: 9,  size: 2.1, delay: 4.2,  duration: 8.1,  dx: -50, dx2:  30 },
  { id: 8,  left: 67, bottom: 20, size: 1.7, delay: 6.3,  duration: 11.5, dx:  40, dx2: -60 },
  { id: 9,  left: 74, bottom: 6,  size: 2.6, delay: 0.4,  duration: 9.0,  dx: -45, dx2:  25 },
  { id: 10, left: 81, bottom: 14, size: 3.4, delay: 2.2,  duration: 12.0, dx:  70, dx2: -35 },
  { id: 11, left: 88, bottom: 3,  size: 1.5, delay: 7.0,  duration: 7.6,  dx: -30, dx2:  50 },
  { id: 12, left: 93, bottom: 25, size: 2.9, delay: 4.8,  duration: 10.5, dx:  55, dx2: -45 },
  { id: 13, left: 4,  bottom: 35, size: 1.8, delay: 3.1,  duration: 8.8,  dx: -55, dx2:  40 },
  { id: 14, left: 27, bottom: 40, size: 2.2, delay: 5.6,  duration: 9.4,  dx:  35, dx2: -20 },
  { id: 15, left: 48, bottom: 32, size: 1.3, delay: 8.2,  duration: 7.9,  dx: -25, dx2:  60 },
  { id: 16, left: 63, bottom: 45, size: 3.1, delay: 1.1,  duration: 11.8, dx:  60, dx2: -55 },
  { id: 17, left: 78, bottom: 38, size: 2.0, delay: 6.7,  duration: 8.3,  dx: -40, dx2:  30 },
  { id: 18, left: 85, bottom: 50, size: 1.6, delay: 9.1,  duration: 10.8, dx:  30, dx2: -35 },
  { id: 19, left: 12, bottom: 55, size: 2.5, delay: 3.9,  duration: 9.6,  dx: -65, dx2:  45 },
  { id: 20, left: 35, bottom: 60, size: 1.2, delay: 7.4,  duration: 8.0,  dx:  50, dx2: -30 },
  { id: 21, left: 56, bottom: 65, size: 2.7, delay: 2.6,  duration: 10.4, dx: -35, dx2:  55 },
  { id: 22, left: 70, bottom: 55, size: 1.9, delay: 5.3,  duration: 9.1,  dx:  45, dx2: -40 },
  { id: 23, left: 91, bottom: 62, size: 3.0, delay: 0.9,  duration: 11.2, dx: -55, dx2:  35 },
];

export default function EmberBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {EMBERS.map(e => (
        <div
          key={e.id}
          className="ember-particle"
          style={{
            left:   `${e.left}%`,
            bottom: `${e.bottom}%`,
            width:  `${e.size}px`,
            height: `${e.size}px`,
            animationDelay:    `${e.delay}s`,
            animationDuration: `${e.duration}s`,
            ['--dx'  as string]: `${e.dx}px`,
            ['--dx2' as string]: `${e.dx2}px`,
          }}
        />
      ))}
    </div>
  );
}
