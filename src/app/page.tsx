'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CUISINE_TAGS } from '@/lib/constants';
import { Search, Target, Map, ChefHat } from 'lucide-react';
import styles from './page.module.css';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/explore');
    }
  }

  return (
    <main className={styles.main}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Discover your next
            <br />
            <span className="gradient-text">favorite dish</span>
          </h1>
          <p className={styles.heroSub}>
            AI-powered insights from real reviews. Find dishes people love,
            explore cuisines, and cook restaurant-worthy meals at home.
          </p>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <div className={styles.searchBar}>
              <span className={styles.searchIcon}><Search size={20} /></span>
              <input
                type="text"
                placeholder={'Try \u201Ccarbonara near me\u201D or \u201Cbest ramen\u201D'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={styles.searchInput}
              />
              <button type="submit" className="btn btn-primary">
                Search
              </button>
            </div>
          </form>
          <div className={styles.chips}>
            {CUISINE_TAGS.slice(0, 8).map((c) => (
              <Link
                key={c}
                href={`/explore?q=${encodeURIComponent(c)}`}
                className={styles.chip}
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={`${styles.featuresGrid} stagger-children`}>
          <div className={`card-static ${styles.featureCard}`}>
            <span className={styles.featureIcon}><Target size={32} color="var(--color-primary)" /></span>
            <h3>Dish-Level Insights</h3>
            <p>
              AI analyzes restaurant reviews to extract the top dishes people
              love — not just star ratings, but what&apos;s actually good.
            </p>
          </div>
          <div className={`card-static ${styles.featureCard}`}>
            <span className={styles.featureIcon}><Map size={32} color="var(--color-primary)" /></span>
            <h3>Map Discovery</h3>
            <p>
              Browse restaurants on an interactive map. Filter by cuisine,
              rating, price, and distance to find exactly what you&apos;re craving.
            </p>
          </div>
          <div className={`card-static ${styles.featureCard}`}>
            <span className={styles.featureIcon}><ChefHat size={32} color="var(--color-primary)" /></span>
            <h3>Get the Recipe</h3>
            <p>
              Loved a dish? Generate a home-cook-friendly recipe instantly.
              Complete with ingredients, steps, and chef&apos;s tips.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <h2>Ready to explore?</h2>
        <p>Find your next favorite restaurant and dish.</p>
        <Link href="/explore" className="btn btn-primary btn-lg">
          Start Exploring →
        </Link>
      </section>
    </main>
  );
}
