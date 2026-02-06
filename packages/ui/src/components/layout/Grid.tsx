import React from 'react';

export interface GridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6;
  gap?: 2 | 4 | 6 | 8;
  className?: string;
}

export const Grid: React.FC<GridProps> = ({
  children,
  cols = 4,
  gap = 6,
  className = '',
}) => {
  const colsClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
  };

  const gapClasses = {
    2: 'gap-2',
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
  };

  return (
    <div className={`grid ${colsClasses[cols]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};
