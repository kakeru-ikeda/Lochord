interface AppIconProps {
  size?: number;
  /** 背景の角丸正方形を表示するか（オンボーディング等の単体表示向け） */
  withBackground?: boolean;
  className?: string;
}

let _idCounter = 0;

export function AppIcon({ size = 24, withBackground = false, className }: AppIconProps) {
  // SVG内のグラデーションIDはページ内で一意にする必要がある
  const id = `lochord-icon-grad-${++_idCounter}`;

  if (withBackground) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 1024 1024"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" rx="224" fill={`url(#${id})`} />
        <rect x="242" y="232" width="140" height="560" rx="70" fill="#fff" />
        <rect x="442" y="432" width="140" height="360" rx="70" fill="#fff" />
        <rect x="642" y="592" width="140" height="200" rx="70" fill="#fff" />
      </svg>
    );
  }

  // ヘッダー等インライン用: 背景なし、バーにグラデーション
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      {/* 左: 最も高い */}
      <rect x="2.5" y="3" width="4.5" height="18" rx="2.25" fill={`url(#${id})`} />
      {/* 中: 中くらい */}
      <rect x="9.75" y="8" width="4.5" height="13" rx="2.25" fill={`url(#${id})`} />
      {/* 右: 最も低い */}
      <rect x="17" y="13" width="4.5" height="8" rx="2.25" fill={`url(#${id})`} />
    </svg>
  );
}
