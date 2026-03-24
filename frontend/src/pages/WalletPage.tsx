import { useCallback } from 'react'
import { BalanceCard } from '../components/wallet/BalanceCard'
import { PaymentMethodsSection } from '../components/wallet/PaymentMethodsSection'
import { TransactionsSection } from '../components/wallet/TransactionsSection'
import { WalletPageHeader } from '../components/wallet/WalletPageHeader'
import { StatusBar } from '../components/StatusBar'
import { MOCK_PAYMENT_METHODS, MOCK_TRANSACTIONS, MOCK_WALLET_BALANCE } from '../data/walletMock'

export function WalletPage(): JSX.Element {
  const onSettings = useCallback(() => {
    // настройки кошелька / API
  }, [])

  const onDeposit = useCallback(() => {
    // открыть пополнение
  }, [])

  const onWithdraw = useCallback(() => {
    // открыть вывод
  }, [])

  const onSeeAllTx = useCallback(() => {
    // полная история
  }, [])

  return (
    <>
      <StatusBar />
      <WalletPageHeader onSettingsClick={onSettings} />
      <main className="flex min-h-0 flex-1 flex-col gap-5 px-4 pb-4">
        <BalanceCard balance={MOCK_WALLET_BALANCE} onDeposit={onDeposit} onWithdraw={onWithdraw} />
        <PaymentMethodsSection methods={MOCK_PAYMENT_METHODS} />
        <TransactionsSection transactions={MOCK_TRANSACTIONS} onSeeAll={onSeeAllTx} />
      </main>
    </>
  )
}
