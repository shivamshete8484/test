//
// Source code recreated from a .class file by IntelliJ IDEA
// (powered by Fernflower decompiler)
//

package gw.api.databuilder;

import com.google.common.base.Preconditions;
import com.google.common.collect.Lists;
import com.guidewire.bc.api.financials.MonetaryAmountsInternal;
import com.guidewire.bc.system.internal.InternalMethods;
import com.guidewire.pl.system.util.DateTimeUtil;
import entity.Account;
import entity.BaseNonReceivableDistItem;
import entity.Charge;
import entity.DirectBillMoneyRcvd;
import entity.DirectBillPayment;
import entity.DirectBillPaymentItem;
import entity.Invoice;
import entity.InvoiceItem;
import entity.PolicyPeriod;
import entity.UnappliedFund;
import gw.api.web.invoice.InvoiceItems;
import gw.pl.currency.MonetaryAmount;
import gw.pl.persistence.core.Bundle;
import java.util.Date;
import java.util.List;
import javax.annotation.Nonnull;
import typekey.PaymentMethod;

public class DirectBillPaymentFixtureBuilder {
    private MonetaryAmount _grossPaymentAmount;
    private PaymentMethod _paymentMethod;
    private Account _payerAccount;
    private boolean _areFixturesCreated;
    private List<DirectBillPaymentItemBuilder> paymentItemBuilders;
    private List<BaseNonReceivableDistItemBuilder> nonReceivableItemBuilders;
    private DirectBillPayment _directBillPayment;
    private Date _receivedDate;
    private boolean _isDraftPayment;
    private UnappliedFund _unappliedFunds;

    public DirectBillPaymentFixtureBuilder() {
        this._paymentMethod = PaymentMethod.TC_CASH;
        this.paymentItemBuilders = Lists.newArrayList();
        this.nonReceivableItemBuilders = Lists.newArrayList();
        this._receivedDate = DateTimeUtil.getNow();
        this._isDraftPayment = false;
    }

    public DirectBillPaymentFixtureBuilder withFullPaymentForInvoice(@Nonnull Invoice invoice) {
        this.withFullPaymentForInvoiceItems(invoice.getInvoiceItems());
        return this;
    }

    public DirectBillPaymentFixtureBuilder withFullPaymentForInvoiceItems(InvoiceItem... invoiceItems) {
        for(InvoiceItem invoiceItem : invoiceItems) {
            this.withPartialPaymentForInvoiceItem(invoiceItem, invoiceItem.getGrossUnsettledAmount());
        }

        return this;
    }

    public DirectBillPaymentFixtureBuilder withFullPaymentForCharge(@Nonnull Charge charge) {
        List<InvoiceItem> itemsList = InternalMethods.asChargeInternal(charge).getInvoiceItemsWithoutOffsetsOrCommissionRemainderOrFrozenSortedByEventDate();
        InvoiceItem[] items = (InvoiceItem[])itemsList.toArray(new InvoiceItem[itemsList.size()]);
        return this.withFullPaymentForInvoiceItems(items);
    }

    public DirectBillPaymentFixtureBuilder withFullPaymentForPolicyPeriod(@Nonnull PolicyPeriod policyPeriod) {
        for(InvoiceItem invoiceItem : InvoiceItems.withoutOffsetsOrCommissionRemainderOrFrozen(policyPeriod.getInvoiceItems())) {
            this.withFullPaymentForInvoiceItem(invoiceItem);
        }

        return this;
    }

    public DirectBillPaymentFixtureBuilder withFullPaymentForInvoiceItem(@Nonnull InvoiceItem invoiceItem) {
        return this.withPartialPaymentForInvoiceItem(invoiceItem, invoiceItem.getGrossUnsettledAmount());
    }

    public DirectBillPaymentFixtureBuilder withPartialPaymentForInvoiceItem(@Nonnull InvoiceItem invoiceItem, @Nonnull MonetaryAmount amount) {
        this.paymentItemBuilders.add(this.createPaymentItemBuilderToPay(invoiceItem, amount));
        this.setPayerFromInvoiceItemIfNoPayerYet(invoiceItem);
        this.incrementGrossPaymentAmount(amount);
        return this;
    }

    public DirectBillPaymentFixtureBuilder withSuspenseItem(@Nonnull MonetaryAmount amount, @Nonnull String policyNumber) {
        this.nonReceivableItemBuilders.add(this.createSuspDistItemBuilderToPay(amount, policyNumber));
        this.incrementGrossPaymentAmount(amount);
        return this;
    }

    public DirectBillPaymentFixtureBuilder withCollateralItem(@Nonnull MonetaryAmount amount) {
        this.nonReceivableItemBuilders.add(this.createCollateralDistItemBuilderToPay(amount));
        this.incrementGrossPaymentAmount(amount);
        return this;
    }

    public DirectBillPaymentFixtureBuilder withPayerAccount(@Nonnull Account payerAccount) {
        this._payerAccount = payerAccount;
        return this;
    }

    public DirectBillPaymentFixtureBuilder withUnappliedFunds(@Nonnull UnappliedFund unappliedFund) {
        this._unappliedFunds = unappliedFund;
        return this;
    }

    public DirectBillPaymentFixtureBuilder withPaymentMethod(@Nonnull PaymentMethod paymentMethod) {
        this._paymentMethod = paymentMethod;
        return this;
    }

    public DirectBillPaymentFixtureBuilder withReceivedDate(@Nonnull Date receivedDate) {
        this._receivedDate = receivedDate;
        return this;
    }

    public DirectBillPaymentFixtureBuilder createFixture() {
        return this.createFixture(false, (Bundle)null);
    }

    public DirectBillPaymentFixtureBuilder createFixtureForStagingTableTest() {
        return this.createFixture(true, (Bundle)null);
    }

    public DirectBillPaymentFixtureBuilder createFixture(Bundle bundle) {
        return this.createFixture(false, bundle);
    }

    public DirectBillPaymentFixtureBuilder createFixtureForStagingTableTest(Bundle bundle) {
        return this.createFixture(true, bundle);
    }

    private DirectBillPaymentFixtureBuilder createFixture(boolean forStagingTest, Bundle bundle) {
        Preconditions.checkState(!this._areFixturesCreated, "Cannot createFixture() more than once.");
        Preconditions.checkState(this._unappliedFunds == null || this._unappliedFunds.getAccount().equals(this._payerAccount), "Cannot use a designated unapplied that does not belong to the payer account.");
        Date today = DateTimeUtil.getNow();
        DirectBillMoneyRcvd moneyReceived;
        if (MonetaryAmountsInternal.isPositive(this._grossPaymentAmount)) {
            moneyReceived = (DirectBillMoneyRcvd)((DirectBillMoneyRcvdBuilder)((DirectBillMoneyRcvdBuilder)((DirectBillMoneyRcvdBuilder)((DirectBillMoneyRcvdBuilder)((DirectBillMoneyRcvdBuilder)((DirectBillMoneyRcvdBuilder)(new DirectBillMoneyRcvdBuilder()).withCurrency(this._grossPaymentAmount.getCurrency())).withPaymentMethod(this._paymentMethod)).withReceivedDate(this._receivedDate)).onAccount(this._payerAccount)).withUnappliedFunds(this._unappliedFunds == null ? this._payerAccount.getDefaultUnappliedFund() : this._unappliedFunds)).withAmount(this._grossPaymentAmount)).create(bundle);
        } else {
            this._grossPaymentAmount = MonetaryAmountsInternal.zeroOf(this._payerAccount.getCurrency());
            moneyReceived = (DirectBillMoneyRcvd)((ZeroDollarDMRBuilder)(new ZeroDollarDMRBuilder()).withCurrency(this._payerAccount.getCurrency())).onAccount(this._payerAccount).create(bundle);
        }

        this._directBillPayment = (DirectBillPayment)((DirectBillPaymentBuilder)(new DirectBillPaymentBuilder()).withCurrency(moneyReceived.getCurrency())).withDirectBillMoneyReceived(moneyReceived).create(bundle);

        for(DirectBillPaymentItemBuilder paymentItemBuilder : this.paymentItemBuilders) {
            DirectBillPaymentItem paymentItem = (DirectBillPaymentItem)paymentItemBuilder.onDirectBillPayment(this._directBillPayment).create(bundle);
            if (forStagingTest) {
                InternalMethods.asDirectBillPaymentItemInternal(paymentItem).setExecutedDate(today);
            }
        }

        for(BaseNonReceivableDistItemBuilder nonReceivableDistItemBuilder : this.nonReceivableItemBuilders) {
            BaseNonReceivableDistItem baseNonReceivableDistItem = (BaseNonReceivableDistItem)nonReceivableDistItemBuilder.onDist(this._directBillPayment).create(bundle);
            if (forStagingTest) {
                InternalMethods.asBaseNonReceivableDistItemInternal(baseNonReceivableDistItem).setExecutedDate(today);
            }
        }

        if (forStagingTest) {
            InternalMethods.asBaseDistInternal(this._directBillPayment).setDistributedDate(today);
            InternalMethods.asPaymentMoneyReceivedInternal(moneyReceived).setAppliedDate(today);
        } else if (!this._isDraftPayment) {
            this._directBillPayment.execute();
            this._directBillPayment.getBundle().commit();
        }

        this._areFixturesCreated = true;
        return this;
    }

    public DirectBillPaymentFixtureBuilder asDraftPayment() {
        this._isDraftPayment = true;
        return this;
    }

    public DirectBillPayment getDirectBillPayment() {
        Preconditions.checkState(this._areFixturesCreated, "Call createFixture() to create all parts of the fixture before using getDirectBillPayment()");
        return this._directBillPayment;
    }

    private void setPayerFromInvoiceItemIfNoPayerYet(@Nonnull InvoiceItem invoiceItem) {
        this.setPayerFromInvoiceIfNoPayerYet(invoiceItem.getInvoice());
    }

    private void setPayerFromInvoiceIfNoPayerYet(Invoice invoice) {
        if (invoice != null) {
            if (this._payerAccount == null) {
                this.withPayerAccount((Account)invoice.getPayer());
            }

        }
    }

    private DirectBillPaymentItemBuilder createPaymentItemBuilderToPay(@Nonnull InvoiceItem invoiceItem, @Nonnull MonetaryAmount amount) {
        return (DirectBillPaymentItemBuilder)((DirectBillPaymentItemBuilder)((DirectBillPaymentItemBuilder)(new DirectBillPaymentItemBuilder()).withCurrency(invoiceItem.getCurrency())).onInvoiceItem(invoiceItem)).grossAmount(amount);
    }

    private DirectSuspPmntItemBuilder createSuspDistItemBuilderToPay(@Nonnull MonetaryAmount amount, @Nonnull String policyNumber) {
        return (DirectSuspPmntItemBuilder)((DirectSuspPmntItemBuilder)((DirectSuspPmntItemBuilder)(new DirectSuspPmntItemBuilder()).withCurrency(amount.getCurrency())).withGrossAmountToApply(amount)).withPolicyNumber(policyNumber);
    }

    private CollateralPaymentItemBuilder createCollateralDistItemBuilderToPay(@Nonnull MonetaryAmount amount) {
        return (CollateralPaymentItemBuilder)((CollateralPaymentItemBuilder)(new CollateralPaymentItemBuilder()).withCurrency(amount.getCurrency())).withGrossAmountToApply(amount);
    }

    public DirectBillPaymentFixtureBuilder incrementGrossPaymentAmount(@Nonnull MonetaryAmount amount) {
        this._grossPaymentAmount = this._grossPaymentAmount == null ? amount : this._grossPaymentAmount.add(amount);
        return this;
    }
}
