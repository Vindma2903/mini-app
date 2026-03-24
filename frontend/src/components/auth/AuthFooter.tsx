export function AuthFooter(): JSX.Element {
  return (
    <footer className="mt-auto flex w-full flex-col items-center gap-1.5 px-8 pb-7 pt-3">
      <p className="text-center font-[family-name:var(--font-inter)] text-[11px] text-[#4b5577]">
        Продолжая, вы соглашаетесь с
      </p>
      <p className="flex flex-wrap items-center justify-center gap-1 text-center font-[family-name:var(--font-inter)] text-[11px]">
        <button type="button" className="font-medium text-[#8b5cf6]">
          Условиями
        </button>
        <span className="text-[#4b5577]">и</span>
        <button type="button" className="font-medium text-[#8b5cf6]">
          Политикой конфиденциальности
        </button>
      </p>
      <p className="font-[family-name:var(--font-inter)] text-[10px] text-[#2a3050]">v1.0.0</p>
    </footer>
  )
}
