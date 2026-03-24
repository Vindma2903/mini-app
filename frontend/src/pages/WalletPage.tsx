import { useCallback, useMemo, useState } from 'react'
import { BalanceCard } from '../components/wallet/BalanceCard'
import { PaymentMethodsSection } from '../components/wallet/PaymentMethodsSection'
import { TransactionsSection } from '../components/wallet/TransactionsSection'
import { WalletPageHeader } from '../components/wallet/WalletPageHeader'
import { StatusBar } from '../components/StatusBar'
import { MOCK_PAYMENT_METHODS } from '../data/walletMock'
import { useGameWalletStore } from '../stores/gameWalletStore'

export function WalletPage(): JSX.Element {
  const balance = useGameWalletStore((s) => s.balance)
  const transactions = useGameWalletStore((s) => s.transactions)
  const addDemoFunds = useGameWalletStore((s) => s.addDemoFunds)
  const withdrawDemoFunds = useGameWalletStore((s) => s.withdrawDemoFunds)
  const [modalMode, setModalMode] = useState<'none' | 'deposit' | 'withdraw'>('none')
  const [amountInput, setAmountInput] = useState('1000')
  const [actionError, setActionError] = useState<string | null>(null)

  const walletBalance = {
    primaryLabel: 'Игровой баланс',
    amountFormatted: new Intl.NumberFormat('ru-RU').format(balance),
    currency: '₽',
    fiatHint: 'Демо-режим без реального кошелька',
  }

  const onSettings = useCallback(() => {
    // настройки кошелька / API
  }, [])

  const onDeposit = useCallback(() => {
    setAmountInput('1000')
    setActionError(null)
    setModalMode('deposit')
  }, [])

  const onWithdraw = useCallback(() => {
    setAmountInput('1000')
    setActionError(null)
    setModalMode('withdraw')
  }, [])

  const onSeeAllTx = useCallback(() => {
    // полная история
  }, [])

  const parsedAmount = useMemo(() => Number(amountInput.replace(/\s+/g, '').replace(',', '.')), [amountInput])

  const onConfirmAmount = useCallback(() => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setActionError('Введите корректную сумму')
      return
    }

    const amount = Math.floor(parsedAmount)
    if (modalMode === 'deposit') {
      addDemoFunds(amount)
      setModalMode('none')
      setActionError(null)
      return
    }

    if (modalMode === 'withdraw') {
      const result = withdrawDemoFunds(amount)
      if (!result.ok) {
        setActionError(result.error ?? 'Не удалось выполнить операцию')
        return
      }
      setModalMode('none')
      setActionError(null)
    }
  }, [addDemoFunds, modalMode, parsedAmount, withdrawDemoFunds])

  const onCloseModal = useCallback(() => {
    setModalMode('none')
    setActionError(null)
  }, [])

  return (
    <>
      <StatusBar />
      <WalletPageHeader onSettingsClick={onSettings} />
      <main className="flex min-h-0 flex-1 flex-col gap-5 px-4 pb-4">
        <BalanceCard balance={walletBalance} onDeposit={onDeposit} onWithdraw={onWithdraw} />
        <PaymentMethodsSection methods={MOCK_PAYMENT_METHODS} />
        <TransactionsSection transactions={transactions} onSeeAll={onSeeAllTx} />
      </main>
      {modalMode !== 'none' ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#02040bcc]/80 p-4">
          <div className="w-full max-w-[393px] rounded-2xl bg-[#141829] p-4 ring-1 ring-inset ring-[#2a2f48]">
            <h3 className="font-[family-name:var(--font-sora)] text-base font-bold text-white">
              {modalMode === 'deposit' ? 'Пополнение баланса' : 'Вывод с баланса'}
            </h3>
            <p className="mt-1 text-xs text-[#8b95b0]">Укажите сумму и подтвердите действие</p>

            <div className="mt-3 rounded-xl bg-[#1c2036] p-3">
              <p className="text-[10px] text-[#8b95b0]">Сумма</p>
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  inputMode="numeric"
                  className="h-10 w-full rounded-lg bg-[#0f1322] px-3 text-sm font-semibold text-white outline-none ring-1 ring-inset ring-[#2a2f48] focus:ring-[#8b5cf6]"
                />
                <span className="text-xs font-medium text-[#8b95b0]">₽</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[500, 1000, 5000].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmountInput(String(value))}
                    className="h-8 rounded-lg bg-[#0f1322] text-xs font-medium text-[#8b95b0]"
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {actionError ? <p className="mt-2 text-xs text-red-400">{actionError}</p> : null}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onCloseModal}
                className="h-10 rounded-lg bg-[#0f1322] text-sm font-medium text-[#8b95b0]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={onConfirmAmount}
                className="h-10 rounded-lg bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-sm font-bold text-[#04120a]"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
