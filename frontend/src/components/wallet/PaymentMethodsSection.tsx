import type { WalletPaymentMethod } from '../../types/wallet'
import { PaymentMethodRow } from './PaymentMethodRow'

export interface PaymentMethodsSectionProps {
  methods: WalletPaymentMethod[]
}

export function PaymentMethodsSection({ methods }: PaymentMethodsSectionProps): JSX.Element {
  return (
    <section className="flex flex-col gap-2.5" aria-label="Методы оплаты">
      <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-white">Методы оплаты</h2>
      <div className="flex flex-col gap-2.5">
        {methods.map((m) => (
          <PaymentMethodRow key={m.id} method={m} />
        ))}
      </div>
    </section>
  )
}
