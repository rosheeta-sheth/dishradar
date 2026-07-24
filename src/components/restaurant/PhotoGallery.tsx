'use client';

import styles from './PhotoGallery.module.css';

interface PhotoGalleryProps {
  photos: string[];
}

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  if (!photos?.length) {
    return <p className={styles.empty}>No photos available</p>;
  }

  return (
    <div className={styles.gallery}>
      {photos.map((url, i) => (
        <div key={i} className={styles.item}>
          <img src={url} alt={`Photo ${i + 1}`} loading="lazy" />
        </div>
      ))}
    </div>
  );
}
