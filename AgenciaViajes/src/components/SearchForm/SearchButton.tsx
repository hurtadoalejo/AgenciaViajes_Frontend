import styles from './SearchButton.module.css';

interface SearchButtonProps {
  onClick: () => void;
}

export default function SearchButton({ onClick }: SearchButtonProps) {
  return (
    <button type="button" className={styles.searchBtn} onClick={onClick}>
      Buscar
    </button>
  );
}
