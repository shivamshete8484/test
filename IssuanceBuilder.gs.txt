//
// Source code recreated from a .class file by IntelliJ IDEA
// (powered by Fernflower decompiler)
//

package gw.api.databuilder;

import com.google.common.collect.Maps;
import com.guidewire.bc.system.internal.InternalMethods;
import com.guidewire.bc.util.BCEntities;
import com.guidewire.bc.util.Dates;
import com.guidewire.pl.system.util.DateTimeUtil;
import entity.Account;
import entity.ChargeBreakdownCategory;
import entity.ChargeBreakdownCategoryType;
import entity.ChargeBreakdownItem;
import entity.ChargePattern;
import entity.Company;
import entity.Contact;
import entity.DelinquencyPlan;
import entity.DownPaymentOverride;
import entity.InvoiceStream;
import entity.Issuance;
import entity.PaymentPlan;
import entity.Plan;
import entity.Policy;
import entity.PolicyDlnqProcess;
import entity.PolicyPeriod;
import entity.PolicyPeriodContact;
import entity.PolicySection;
import entity.Producer;
import entity.ProducerCode;
import entity.ProducerCodeRoleEntry;
import entity.ReturnPremiumPlan;
import entity.SectionCommissionOverride;
import entity.SecurityZone;
import gw.api.databuilder.populator.BeanPopulator;
import gw.api.domain.accounting.ChargePatternKey;
import gw.api.domain.charge.ChargeInitializer;
import gw.api.system.BCConfigParameters;
import gw.api.web.invoice.InvoicingOverrider;
import gw.lang.PublishInGosu;
import gw.pl.currency.MonetaryAmount;
import gw.pl.persistence.core.Bundle;
import gw.pl.util.BigDecimalUtil;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.annotation.Nonnull;
import org.joda.time.DateTime;
import typekey.ConfirmationNotificationState;
import typekey.Currency;
import typekey.DelinquencyReason;
import typekey.Jurisdiction;
import typekey.LOBCode;
import typekey.PayableCriteria;
import typekey.Periodicity;
import typekey.PolicyClosureStatus;
import typekey.PolicyPeriodBillingMethod;
import typekey.PolicyPeriodRole;
import typekey.PolicyRole;
import typekey.SectionType;
import typekey.UWCompany;

@PublishInGosu
public class IssuanceBuilder extends InCurrencySiloBuilder<PolicyPeriod, IssuanceBuilder> {
    private Map<PolicyRole, ProducerCode> _producerCodesMap = Maps.newHashMap();
    private Map<PolicyRole, ProducerCodeCreationPlan> _producerCodesToCreate = Maps.newHashMap();
    private Map<ChargeBuilder, HasCurrency> _chargeBuilders = Maps.newHashMap();
    private BeanPopulator<? super PolicyPeriod> _issuancePopulator = this.createIssuancePopulator();
    private static final String ISSUANCE_POPULATOR_ID = "issuance populator";
    private InvoicingOverrider _invoicingOverrider;
    private final int RUN_AFTER_OTHER_POPULATORS = 2147483646;
    private BeanPopulator<PolicyPeriod> _accountPopulator = null;
    private static final String ACCOUNT_POPULATOR_ID = "account populator";
    private BeanPopulator<PolicyPeriod> _paymentPlanPopulator = null;
    private static final String PAYMENTPLAN_POPULATOR_ID = "payment plan populator";
    private BigDecimal _downPaymentOverride = null;
    private MonetaryAmount _depositRequirement;
    private Boolean _equityWarningsEnabledOverride;
    private Integer _equityBufferOverride;

    public IssuanceBuilder() {
        super(PolicyPeriod.TYPE.get());
        Plan existingPlan = ReturnPremiumPlan.finder.findFirstActivePlanByPlanOrder(ReturnPremiumPlan.TYPE.get());
        if (existingPlan == null) {
            this.withDefaultReturnPremiumPlan();
        }

        this.onDefaultAccountUpToUnderContract().withPolicyNumber("PP-" + BCDataBuilder.createRandomWordPair()).withBoundDateToday().withPaymentPlanNewlyCreatedMonthly().withOneYearPeriodStartingToday().asOpenStatus().withProductPersonalAuto().withProducerCodeNewlyCreatedPrimaryPayOnPay(PERCENT_10).addChargePremium(new BigDecimal("1000"));
    }

    public IssuanceBuilder withListBillAccount(Account account, PaymentPlan paymentPlan, InvoiceStream invoiceStream) {
        return this.asListBill().withOverridingPayerAccount(account).withPaymentPlan(paymentPlan).withOverridingInvoiceStream(invoiceStream);
    }

    public IssuanceBuilder onAccount(final Account account) {
        if (this._accountPopulator != null) {
            this.removePopulator("account populator");
        }

        this._accountPopulator = new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod bean) {
                Policy policy = (Policy)((PolicyBuilder)(new PolicyBuilder()).withCurrency(bean.getCurrency())).create(bean.getBundle());
                InternalMethods.asAccountInternal(account).addToPolicies(policy);
                InternalMethods.asPolicyInternal(policy).setAccount(account);
                policy.addToPolicyPeriods(bean);
            }
        };
        this.addPopulator("account populator", this._accountPopulator);
        this.withCurrency(account.getCurrency());
        return this;
    }

    public IssuanceBuilder onDefaultAccountUpToOutstanding() {
        AccountBuilder accountBuilder = (new AccountBuilder()).withDistributionUpToAmountOutstanding();
        return this.onAccount(accountBuilder);
    }

    public IssuanceBuilder onDefaultAccountUpToUnderContract() {
        AccountBuilder accountBuilder = (new AccountBuilder()).withDistributionUpToAmountUnderContract();
        return this.onAccount(accountBuilder);
    }

    private IssuanceBuilder onAccount(final AccountBuilder accountBuilder) {
        if (this._accountPopulator != null) {
            this.removePopulator("account populator");
        }

        this._accountPopulator = new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod bean) {
                Policy policy = (Policy)((PolicyBuilder)(new PolicyBuilder()).withCurrency(bean.getCurrency())).onAccount((Account)((AccountBuilder)accountBuilder.withCurrency(bean.getCurrency())).create(bean.getBundle())).create(bean.getBundle());
                policy.addToPolicyPeriods(bean);
            }
        };
        this.addPopulator("account populator", this._accountPopulator);
        return this;
    }

    public IssuanceBuilder withOneYearPeriodStartingToday() {
        return this.withOneYearPeriodStartingOn(today());
    }

    public IssuanceBuilder withProduct(final LOBCode lobCode) {
        this.addPopulator(new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod bean) {
                Policy policy = bean.getPolicy();
                if (policy != null) {
                    policy.setLOBCode(lobCode);
                }

            }
        });
        return this;
    }

    public IssuanceBuilder withProductPersonalAuto() {
        return this.withProduct(LOBCode.getTypeKey("PersonalAuto"));
    }

    public IssuanceBuilder withProductCommercialProperty() {
        return this.withProduct(LOBCode.getTypeKey("CommercialProperty"));
    }

    public IssuanceBuilder withProductBusinessAuto() {
        return this.withProduct(LOBCode.getTypeKey("BusinessAuto"));
    }

    public IssuanceBuilder withProductWorkersComp() {
        return this.withProduct(LOBCode.getTypeKey("WorkersComp"));
    }

    public IssuanceBuilder withBoundDateToday() {
        return this.withBoundDate(today());
    }

    public IssuanceBuilder withPolicyNumber(String policyNumber) {
        this.set(PolicyPeriod.POLICYNUMBER_PROP.get(), policyNumber);
        return this;
    }

    public IssuanceBuilder withOfferNumber(String offerNumber) {
        this.set(PolicyPeriod.OFFERNUMBER_PROP.get(), offerNumber);
        return this;
    }

    public IssuanceBuilder withOverridingInvoiceStream(@Nonnull InvoiceStream invoiceStream) {
        this.getInvoicingOverrider().withOverridingInvoiceStream(invoiceStream);
        return this;
    }

    public IssuanceBuilder withOverridingPayerAccount(Account account) {
        this.getInvoicingOverrider().withOverridingPayerAccount(account);
        return this;
    }

    public IssuanceBuilder closedOn(Date closeDate) {
        this.withClosureStatus(PolicyClosureStatus.TC_CLOSED);
        this.withCloseDate(closeDate);
        return this;
    }

    public IssuanceBuilder withCloseDate(Date closeDate) {
        this.set(PolicyPeriod.CLOSEDATE_PROP.get(), closeDate);
        if (closeDate == null) {
            this.set(PolicyPeriod.NEXTARCHIVECHECKDATE_PROP.get(), (Object)null);
        } else {
            this.set(PolicyPeriod.NEXTARCHIVECHECKDATE_PROP.get(), DateTimeUtil.addDays(closeDate, (Integer)BCConfigParameters.ArchivePolicyPeriodDays.getValue(), true));
        }

        return this;
    }

    public IssuanceBuilder withClosureStatus(PolicyClosureStatus closureStatus) {
        this.set(PolicyPeriod.CLOSURESTATUS_PROP.get(), closureStatus);
        if (!PolicyClosureStatus.TC_CLOSED.equals(closureStatus)) {
            this.withCloseDate((Date)null);
        }

        return this;
    }

    public IssuanceBuilder asOpenStatus() {
        return this.withClosureStatus(PolicyClosureStatus.TC_OPEN).withCloseDate((Date)null);
    }

    public IssuanceBuilder asOpenLockedStatus() {
        return this.withClosureStatus(PolicyClosureStatus.TC_OPENLOCKED).withCloseDate((Date)null);
    }

    public IssuanceBuilder withBoundDate(Date boundDate) {
        this.set(PolicyPeriod.BOUNDDATE_PROP.get(), boundDate);
        return this;
    }

    public IssuanceBuilder withEffectiveDate(Date effectiveDate) {
        this.set(PolicyPeriod.POLICYPEREFFDATE_PROP.get(), effectiveDate);
        return this;
    }

    public IssuanceBuilder withExpirationDate(Date expirationDate) {
        this.set(PolicyPeriod.POLICYPEREXPIRDATE_PROP.get(), expirationDate);
        return this;
    }

    public IssuanceBuilder withSecurityZone(SecurityZone securityZone) {
        this.set(PolicyPeriod.SECURITYZONE_PROP.get(), securityZone);
        return this;
    }

    public IssuanceBuilder withJurisdiction(Jurisdiction jurisdiction) {
        this.set(PolicyPeriod.RISKJURISDICTION_PROP.get(), jurisdiction);
        return this;
    }

    public IssuanceBuilder withUWCompany(UWCompany uwCompany) {
        this.set(PolicyPeriod.UWCOMPANY_PROP.get(), uwCompany);
        return this;
    }

    public IssuanceBuilder withOneYearPeriodStartingOn(Date effectiveDate) {
        return this.withEffectiveDate(effectiveDate).withExpirationDate(DateTimeUtil.addYears(effectiveDate, 1));
    }

    public IssuanceBuilder withPaymentPlanNewlyCreated(Periodicity periodicity, BigDecimal downPaymentPercent) {
        PaymentPlanBuilder paymentPlanBuilder = (new PaymentPlanBuilder()).withPeriodicity(periodicity).withDownPaymentPercent(downPaymentPercent);
        return this.withPaymentPlan(paymentPlanBuilder);
    }

    public IssuanceBuilder withPaymentPlanNewlyCreatedMonthly() {
        return this.withPaymentPlanNewlyCreated(Periodicity.TC_MONTHLY, PERCENT_10);
    }

    public IssuanceBuilder withPaymentPlanNewlyCreatedQuarterly() {
        return this.withPaymentPlanNewlyCreated(Periodicity.TC_QUARTERLY, PERCENT_25);
    }

    public IssuanceBuilder withPaymentPlanNewlyCreatedFullDownPayment() {
        return this.withPaymentPlanNewlyCreated(Periodicity.TC_MONTHLY, PERCENT_100);
    }

    public IssuanceBuilder withPaymentPlan(final PaymentPlanBuilder paymentPlanBuilder) {
        if (this._paymentPlanPopulator != null) {
            this.removePopulator("payment plan populator");
        }

        this._paymentPlanPopulator = new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod bean) {
                PaymentPlan paymentPlan = (PaymentPlan)((PaymentPlanBuilder)paymentPlanBuilder.withSingleCurrency(bean.getCurrency())).create(bean.getBundle());
                InternalMethods.asPolicyPeriodInternal(bean).setPaymentPlan(paymentPlan);
                bean.setEquityBuffer(paymentPlan.getEquityBuffer());
            }
        };
        this.addPopulator("payment plan populator", this._paymentPlanPopulator);
        return this;
    }

    public IssuanceBuilder withPaymentPlan(final PaymentPlan paymentPlan) {
        if (this._paymentPlanPopulator != null) {
            this.removePopulator("payment plan populator");
        }

        this._paymentPlanPopulator = new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod bean) {
                InternalMethods.asPolicyPeriodInternal(bean).setPaymentPlan(paymentPlan);
                bean.setEquityBuffer(paymentPlan.getEquityBuffer());
            }
        };
        this.addPopulator("payment plan populator", this._paymentPlanPopulator);
        return this;
    }

    public IssuanceBuilder withPaymentPlan(String paymentPlanString) {
        PaymentPlan paymentPlan = (PaymentPlan)findSingleEntityMatchingProperty(PaymentPlan.TYPE.get(), PaymentPlan.NAME_PROP, paymentPlanString);
        return this.withPaymentPlan(paymentPlan);
    }

    public IssuanceBuilder withDepositRequirement(MonetaryAmount depositRequirement) {
        this._depositRequirement = depositRequirement;
        return this;
    }

    public IssuanceBuilder withDefaultReturnPremiumPlan() {
        this.addReturnPremiumPlanPopulator(new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod policyPeriod) {
                if (policyPeriod.getReturnPremiumPlan() == null) {
                    ReturnPremiumPlan returnPremiumPlan = (ReturnPremiumPlan)(new ReturnPremiumPlanBuilder()).create(policyPeriod.getBundle());
                    policyPeriod.setReturnPremiumPlan(returnPremiumPlan);
                }

            }
        });
        return this;
    }

    public IssuanceBuilder withPaymentPlanNewlyCreatedReporting(BigDecimal downPaymentPercentage) {
        PaymentPlanBuilder paymentPlanBuilder = (new PaymentPlanBuilder()).asReporting().withDownPaymentPercent(downPaymentPercentage);
        return this.withPaymentPlan(paymentPlanBuilder);
    }

    public IssuanceBuilder withReturnPremiumPlanOnBillFirstToLast() {
        this.addReturnPremiumPlanPopulator(new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod policyPeriod) {
                ReturnPremiumPlanBuilder returnPremiumPlanBuilder = new ReturnPremiumPlanBuilder();
                returnPremiumPlanBuilder.use70Configuration();
                ReturnPremiumPlan returnPremiumPlan = (ReturnPremiumPlan)returnPremiumPlanBuilder.create(policyPeriod.getBundle());
                policyPeriod.setReturnPremiumPlan(returnPremiumPlan);
            }
        });
        return this;
    }

    public IssuanceBuilder withReturnPremiumPlan(final ReturnPremiumPlanBuilder returnPremiumPlanBuilder) {
        this.addReturnPremiumPlanPopulator(new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod bean) {
                bean.setReturnPremiumPlan((ReturnPremiumPlan)returnPremiumPlanBuilder.create(bean.getBundle()));
            }
        });
        return this;
    }

    public IssuanceBuilder withReturnPremiumPlan(ReturnPremiumPlan returnPremiumPlan) {
        this.set(PolicyPeriod.RETURNPREMIUMPLAN_PROP.get(), returnPremiumPlan);
        return this;
    }

    private void addReturnPremiumPlanPopulator(BeanPopulator<PolicyPeriod> returnPremiumPlanPopulator) {
        this.addPopulator(PolicyPeriod.RETURNPREMIUMPLAN_PROP.get(), returnPremiumPlanPopulator);
    }

    public IssuanceBuilder overrideDownPaymentPercent(BigDecimal downPaymentPercent) {
        this._downPaymentOverride = downPaymentPercent;
        return this;
    }

    public IssuanceBuilder onPolicy(final Policy policy) {
        this.addPopulator(new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod bean) {
                policy.addToPolicyPeriods(bean);
            }
        });
        return this;
    }

    public IssuanceBuilder withTermNumber(int termNumber) {
        this.set(PolicyPeriod.TERMNUMBER_PROP.get(), termNumber);
        return this;
    }

    public IssuanceBuilder withPrimaryInsured(final String name) {
        this.addPopulator(new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod bean) {
                Company company = (Company)((CompanyBuilder)(new CompanyBuilder()).withName(name)).create();
                PolicyPeriodContact policyPeriodContact = (PolicyPeriodContact)(new PolicyPeriodContactBuilder()).withRole(PolicyPeriodRole.TC_PRIMARYINSURED).withContact(company).create(bean.getBundle());
                bean.addToContacts(policyPeriodContact);
            }
        });
        return this;
    }

    public IssuanceBuilder withNoCharges() {
        this._chargeBuilders.clear();
        return this;
    }

    public IssuanceBuilder addChargePremium() {
        return this.addChargePremium(new BigDecimal("500"));
    }

    public IssuanceBuilder addChargePremium(MonetaryAmount amount) {
        return this.addChargeWithPatternAndAmount(ChargePatternKey.PREMIUM.get(), amount);
    }

    private IssuanceBuilder addChargePremium(BigDecimal amount) {
        return this.addChargeWithPatternAndAmount(ChargePatternKey.PREMIUM.get(), amount);
    }

    public IssuanceBuilder addChargePremiumWithSectionType(MonetaryAmount amount, SectionType sectionType) {
        return this.addChargeWithPatternAndAmountAndSectionType(ChargePatternKey.PREMIUM.get(), amount, sectionType);
    }

    public IssuanceBuilder addChargeTaxes(MonetaryAmount amount) {
        return this.addChargeWithPatternAndAmount(ChargePatternKey.TAXES.get(), amount);
    }

    public IssuanceBuilder addChargesPremium(MonetaryAmount... premiumAmounts) {
        for(MonetaryAmount premiumAmount : premiumAmounts) {
            this.addChargeWithPatternAndAmount(ChargePatternKey.PREMIUM.get(), premiumAmount);
        }

        return this;
    }

    public IssuanceBuilder replaceChargesWithNewChargeWithPatternAndAmount(ChargePattern chargePattern, MonetaryAmount amount) {
        this.withNoCharges();
        return this.addChargeWithPatternAndAmount(chargePattern, amount);
    }

    public IssuanceBuilder replaceChargesWithNewChargeWithPatternAndAmountAndCommissionableAmount(ChargePattern chargePattern, MonetaryAmount amount, MonetaryAmount commissionableAmount) {
        this.withNoCharges();
        return this.addChargeWithPatternAndAmountAndCommissionableAmount(chargePattern, amount, commissionableAmount);
    }

    public IssuanceBuilder replaceChargesWithNewChargePremiumWithAmount(MonetaryAmount amount) {
        this.withNoCharges();
        return this.addChargeWithPatternAndAmount(ChargePatternKey.PREMIUM.get(), amount);
    }

    public IssuanceBuilder replaceChargesWithPremiumWithAmountAndCommissionableAmount(MonetaryAmount amount, MonetaryAmount commissionableAmount) {
        this.withNoCharges();
        return this.addChargeWithPatternAndAmountAndCommissionableAmount(ChargePatternKey.PREMIUM.get(), amount, commissionableAmount);
    }

    public IssuanceBuilder replaceChargesWithNewChargePremiumWithAmount(BigDecimal amount) {
        this.withNoCharges();
        return this.addChargeWithPatternAndAmount(ChargePatternKey.PREMIUM.get(), amount);
    }

    public IssuanceBuilder replaceChargesWithNewChargePremiumIncludingTaxes(MonetaryAmount premiumAmount, MonetaryAmount taxAmount) {
        this.withNoCharges();
        return this.addChargeWithPremiumAndTaxes(premiumAmount, taxAmount);
    }

    public IssuanceBuilder addChargeWithPatternAndAmountAndSectionType(final ChargePattern chargePattern, final MonetaryAmount amount, final SectionType sectionType) {
        this.addPopulator(new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod policyPeriod) {
                PolicySection policySection = (PolicySection)Arrays.stream(policyPeriod.getPolicySections()).filter((ps) -> sectionType.equals(ps.getSectionType())).findFirst().get();
                IssuanceBuilder.this.addChargeBuilderWithDeferredCurrency((new ChargeBuilder()).asChargePattern(chargePattern).withAmount(amount).withPolicySection(policySection));
            }
        });
        return this;
    }

    public IssuanceBuilder withPolicySection(final SectionType sectionType) {
        this.addPopulator(new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod policyPeriod) {
                PolicySection policySection = (PolicySection)((PolicySectionBuilder)(new PolicySectionBuilder()).withSectionType(sectionType).withCurrency(policyPeriod.getCurrency())).create(policyPeriod.getBundle());
                policyPeriod.addToPolicySections(policySection);
            }
        });
        return this;
    }

    public IssuanceBuilder addChargeWithPatternAndAmount(ChargePattern chargePattern, MonetaryAmount amount) {
        return this.addChargeBuilderWithDeferredCurrency((new ChargeBuilder()).asChargePattern(chargePattern).withAmount(amount));
    }

    public IssuanceBuilder addChargeWithPatternAndAmountAndCommissionableAmount(ChargePattern chargePattern, MonetaryAmount amount, MonetaryAmount commissionableAmount) {
        return this.addChargeBuilderWithDeferredCurrency((new ChargeBuilder()).asChargePattern(chargePattern).withAmount(amount).withCommissionableAmount(commissionableAmount));
    }

    private IssuanceBuilder addChargeWithPatternAndAmount(ChargePattern chargePattern, BigDecimal amount) {
        return this.addChargeBuilderWithDeferredCurrency((new ChargeBuilder()).asChargePattern(chargePattern).withAmount(amount));
    }

    private IssuanceBuilder addChargeWithPremiumAndTaxes(MonetaryAmount premiumAmount, MonetaryAmount taxAmount) {
        ChargeBreakdownCategoryType premiumOrTaxes = (ChargeBreakdownCategoryType)(new ChargeBreakdownCategoryTypeBuilder()).withName("RateType").create();
        ChargeBreakdownCategory premiumCategory = (ChargeBreakdownCategory)(new ChargeBreakdownCategoryBuilder()).withCategoryType(premiumOrTaxes).withCategoryName("Premium").create();
        ChargeBreakdownCategory taxesCategory = (ChargeBreakdownCategory)(new ChargeBreakdownCategoryBuilder()).withCategoryType(premiumOrTaxes).withCategoryName("Taxes").create();
        return this.addChargeBuilderWithDeferredCurrency((new ChargeBuilder()).asChargePattern(ChargePatternKey.PREMIUMINCLUDINGTAXES).withAmount(premiumAmount.add(taxAmount)).addBreakdownItem((ChargeBreakdownItem)(new ChargeBreakdownItemBuilder()).addCategory(premiumCategory).withAmount(premiumAmount).asCommissionable().create()).addBreakdownItem((ChargeBreakdownItem)(new ChargeBreakdownItemBuilder()).addCategory(taxesCategory).withAmount(taxAmount).asNotCommissionable().create()));
    }

    public IssuanceBuilder addCharge(ChargeBuilder chargeBuilder) {
        return this.addCharges(Collections.singletonList(chargeBuilder));
    }

    public IssuanceBuilder addCharges(List<ChargeBuilder> chargeBuilders) {
        for(ChargeBuilder chargeBuilder : chargeBuilders) {
            this._chargeBuilders.put(chargeBuilder, IssuanceBuilder.HasCurrency.YES);
        }

        this.addPopulator("issuance populator", Integer.MAX_VALUE, this._issuancePopulator);
        return this;
    }

    private IssuanceBuilder addChargeBuilderWithDeferredCurrency(ChargeBuilder chargeBuilder) {
        this._chargeBuilders.put(chargeBuilder, IssuanceBuilder.HasCurrency.NO);
        this.addPopulator("issuance populator", Integer.MAX_VALUE, this._issuancePopulator);
        return this;
    }

    public IssuanceBuilder runDelinquency() {
        this.addPopulator(new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod bean) {
                InternalMethods.asAccountInternal(bean.getAccount()).onChargesDue();
            }
        });
        return this;
    }

    public IssuanceBuilder withDefaultContact() {
        this.addPopulator(new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod bean) {
                bean.addToContacts((PolicyPeriodContact)(new PolicyPeriodContactBuilder()).withDefaultRole().withDefaultContact().create(bean.getBundle()));
            }
        });
        return this;
    }

    public IssuanceBuilder asDirectBill() {
        return this.withBillingMethod(PolicyPeriodBillingMethod.TC_DIRECTBILL);
    }

    public IssuanceBuilder asListBill() {
        return this.withBillingMethod(PolicyPeriodBillingMethod.TC_LISTBILL);
    }

    public IssuanceBuilder asAgencyBill() {
        return this.withBillingMethod(PolicyPeriodBillingMethod.TC_AGENCYBILL);
    }

    public IssuanceBuilder withBillingMethod(PolicyPeriodBillingMethod billingMethod) {
        this.set(PolicyPeriod.BILLINGMETHOD_PROP.get(), billingMethod);
        return this;
    }

    public IssuanceBuilder holdInvoicingWhenDelinquent() {
        this.set(PolicyPeriod.HOLDINVOICINGWHENDELINQUENT_PROP.get(), true);
        return this;
    }

    public IssuanceBuilder doNotHoldInvoicingWhenDelinquent() {
        this.set(PolicyPeriod.HOLDINVOICINGWHENDELINQUENT_PROP.get(), false);
        return this;
    }

    public IssuanceBuilder makeDelinquent() {
        this.addPopulator(new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod bean) {
                PolicyDlnqProcess delinquencyProcess = (PolicyDlnqProcess)BCEntities.createWithSameCurrencyAs(PolicyDlnqProcess.TYPE, bean);
                InternalMethods.asPolicyDlnqProcessInternal(delinquencyProcess).start(bean, DelinquencyReason.TC_PASTDUE);
            }
        });
        return this;
    }

    public IssuanceBuilder withProducerCode(PolicyRole policyRole, ProducerCode producerCode) {
        this._producerCodesMap.put(policyRole, producerCode);
        this._producerCodesToCreate.remove(policyRole);
        this.addPopulator("issuance populator", Integer.MAX_VALUE, this._issuancePopulator);
        return this;
    }

    public IssuanceBuilder withProducerCodeNewlyCreated(PolicyRole policyRole, PayableCriteria payableCriteria, BigDecimal commissionRate) {
        ProducerCodeCreationPlan producerCodeCreationPlan = new ProducerCodeCreationPlan(payableCriteria, commissionRate, policyRole);
        this._producerCodesToCreate.put(policyRole, producerCodeCreationPlan);
        this._producerCodesMap.remove(policyRole);
        this.addPopulator("issuance populator", Integer.MAX_VALUE, this._issuancePopulator);
        return this;
    }

    public IssuanceBuilder withNoProducerCodes() {
        this._producerCodesToCreate.clear();
        this._producerCodesMap.clear();
        return this;
    }

    public IssuanceBuilder withProducerCodeNewlyCreatedPrimaryPayOnPay(BigDecimal commissionRate) {
        return this.withProducerCodeNewlyCreatedPrimary(PayableCriteria.TC_PAYMENTRECEIVED, commissionRate);
    }

    public IssuanceBuilder withProducerCodeNewlyCreatedPrimary(PayableCriteria payableCriteria, BigDecimal commissionRate) {
        return this.withProducerCodeNewlyCreated(PolicyRole.TC_PRIMARY, payableCriteria, commissionRate);
    }

    public IssuanceBuilder withProducerCodePrimary(ProducerCode producerCode) {
        return this.withProducerCode(PolicyRole.TC_PRIMARY, producerCode);
    }

    public IssuanceBuilder withProducerCodeSecondary(ProducerCode producerCode) {
        return this.withProducerCode(PolicyRole.getTypeKey("secondary"), producerCode);
    }

    public IssuanceBuilder changePrimaryPayableCriteria(PayableCriteria payableCriteria) {
        ProducerCodeCreationPlan creationPlan = (ProducerCodeCreationPlan)this._producerCodesToCreate.get(PolicyRole.TC_PRIMARY);
        creationPlan.payableCriteria = payableCriteria;
        return this;
    }

    public IssuanceBuilder withContact(final Contact contact) {
        this.addPopulator(new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod bean) {
                bean.addToContacts(contact);
            }
        });
        return this;
    }

    public IssuanceBuilder withContact(final PolicyPeriodContact policyPeriodContact) {
        this.addPopulator(new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod bean) {
                bean.addToContacts(policyPeriodContact);
            }
        });
        return this;
    }

    public IssuanceBuilder eligibleForFullPayDiscount() {
        this.set(PolicyPeriod.ELIGIBLEFORFULLPAYDISCOUNT_PROP.get(), true);
        return this;
    }

    public IssuanceBuilder withFullPayDiscountDate(Date date) {
        this.set(PolicyPeriod.FULLPAYDISCOUNTUNTIL_PROP.get(), date);
        return this;
    }

    public IssuanceBuilder fullPayDiscountEvaluated() {
        this.set(PolicyPeriod.FULLPAYDISCOUNTEVALUATED_PROP.get(), true);
        return this;
    }

    public IssuanceBuilder withDiscountedPaymentThreshold(MonetaryAmount amount) {
        this.set(PolicyPeriod.DISCOUNTEDPAYMENTTHRESHOLD_PROP.get(), amount);
        return this;
    }

    public IssuanceBuilder withDelinquencyPlan(final DelinquencyPlan delinquencyPlan) {
        this.addPopulator(new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod bean) {
                bean.setPolicyPeriodDelinquencyPlan(delinquencyPlan);
            }
        });
        return this;
    }

    public IssuanceBuilder withEffectiveDate(DateTime policyPeriodEffectiveDate) {
        return this.withEffectiveDate(policyPeriodEffectiveDate.toDate());
    }

    public IssuanceBuilder withExpirationDate(DateTime policyPeriodExpirationDate) {
        return this.withExpirationDate(policyPeriodExpirationDate.toDate());
    }

    public IssuanceBuilder withDoNotNotifyConfirmationNotification() {
        return this.withConfirmationNotificationState(ConfirmationNotificationState.TC_DONOTNOTIFY);
    }

    public IssuanceBuilder withNotifyUponSufficientPaymentConfirmationNotification() {
        return this.withConfirmationNotificationState(ConfirmationNotificationState.TC_NOTIFYUPONSUFFICIENTPAYMENT);
    }

    public IssuanceBuilder withConfirmationNotificationState(ConfirmationNotificationState notificationState) {
        this.set(PolicyPeriod.CONFIRMATIONNOTIFICATIONSTATE_PROP.get(), notificationState);
        return this;
    }

    public IssuanceBuilder withBoundDate(DateTime boundDate) {
        return this.withBoundDate(boundDate.toDate());
    }

    public IssuanceBuilder withOneYearPeriodStartingOn(int year, int month, int day) {
        return this.withOneYearPeriodStartingOn(Dates.atMidnight(year, month, day));
    }

    public IssuanceBuilder withOneYearPeriodStartingOn(DateTime effectiveDate) {
        return this.withOneYearPeriodStartingOn(effectiveDate.toDate());
    }

    public IssuanceBuilder withEquityWarningsEnabled(boolean equityWarningsEnabled) {
        this._equityWarningsEnabledOverride = equityWarningsEnabled;
        return this;
    }

    public IssuanceBuilder withEquityBuffer(int equityBuffer) {
        this._equityBufferOverride = equityBuffer;
        return this;
    }

    private BeanPopulator<PolicyPeriod> createIssuancePopulator() {
        return new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod policyPeriod) {
                Issuance issuance = (Issuance)BCEntities.createWithSameCurrencyAs(Issuance.TYPE, policyPeriod);
                issuance.setIssuanceAccount(policyPeriod.getAccount());
                issuance.initializeIssuancePolicyPeriod(policyPeriod);
                issuance.setOfferNumber(policyPeriod.getOfferNumber());
                issuance.setPolicyPaymentPlan(policyPeriod.getPaymentPlan());
                issuance.setDepositRequirement(IssuanceBuilder.this._depositRequirement);
                IssuanceBuilder.this.addChargesToIssuance(issuance);
                IssuanceBuilder.this.addProducerCodesToIssuance(issuance);
                IssuanceBuilder.this.addNewlyCreatedProducerCodesToIssuance(issuance);
                IssuanceBuilder.this.addPaymentPlanOverrides(issuance);
                issuance.execute();
                IssuanceBuilder.this.addEquityBufferOverrides(policyPeriod);
            }
        };
    }

    public IssuanceBuilder withSectionTypeCommissionOverride(final SectionType sectionType, final HashMap<PolicyRole, BigDecimal> rolesAndRates) {
        this.addPopulator(new BeanPopulator<PolicyPeriod>() {
            public void execute(PolicyPeriod bean) {
                PolicySection section = (PolicySection)BCEntities.create(PolicySection.TYPE, bean.getCurrency(), bean.getBundle());
                section.setSectionType(sectionType);

                for(PolicyRole policyRole : rolesAndRates.keySet()) {
                    SectionCommissionOverride sectionCommissionOverride = (SectionCommissionOverride)BCEntities.create(SectionCommissionOverride.TYPE, bean.getCurrency(), bean.getBundle());
                    BigDecimal rate = rolesAndRates.get(policyRole) != null ? (BigDecimal)rolesAndRates.get(policyRole) : BigDecimalUtil.ZERO;
                    sectionCommissionOverride.setOverrideRate(rate);
                    sectionCommissionOverride.setRole(policyRole);
                    section.addToSectionCommissionOverrides(sectionCommissionOverride);
                }

                bean.addToPolicySections(section);
            }
        });
        return this;
    }

    private void addEquityBufferOverrides(PolicyPeriod policyPeriod) {
        if (this._equityBufferOverride != null) {
            policyPeriod.setEquityBuffer(this._equityBufferOverride);
        }

        if (this._equityWarningsEnabledOverride != null) {
            policyPeriod.setEquityWarningsEnabled(this._equityWarningsEnabledOverride);
        }

    }

    private void addPaymentPlanOverrides(Issuance issuance) {
        if (this._downPaymentOverride != null) {
            DownPaymentOverride modifier = (DownPaymentOverride)(new DownPaymentOverrideBuilder()).withDownPayment(this._downPaymentOverride).create(issuance.getBundle());
            issuance.addToPaymentPlanModifiers(modifier);
        }

    }

    private void addChargesToIssuance(Issuance issuance) {
        for(ChargeBuilder chargeBuilder : this._chargeBuilders.keySet()) {
            chargeBuilder.onBillingInstruction(issuance);
            if (this._chargeBuilders.get(chargeBuilder) == IssuanceBuilder.HasCurrency.NO) {
                chargeBuilder.withCurrency(issuance.getCurrency());
            }

            ChargeInitializer var4 = chargeBuilder.initialize();
        }

    }

    private void addProducerCodesToIssuance(Issuance issuance) {
        for(Map.Entry<PolicyRole, ProducerCode> entry : this._producerCodesMap.entrySet()) {
            ProducerCodeRoleEntry roleEntry = this.createProducerCodeRoleEntry(entry, issuance.getBundle());
            issuance.addToProducerCodes(roleEntry);
        }

    }

    private void addNewlyCreatedProducerCodesToIssuance(Issuance issuance) {
        for(PolicyRole role : this._producerCodesToCreate.keySet()) {
            ProducerCodeCreationPlan creationPlan = (ProducerCodeCreationPlan)this._producerCodesToCreate.get(role);
            ProducerCode producerCode = creationPlan.generateProducerCode(issuance.getBundle(), issuance.getCurrency());
            ProducerCodeRoleEntry producerCodeRoleEntry = this.createProducerCodeRoleEntry(issuance.getBundle(), producerCode, role);
            issuance.addToProducerCodes(producerCodeRoleEntry);
        }

    }

    private ProducerCodeRoleEntry createProducerCodeRoleEntry(Map.Entry<PolicyRole, ProducerCode> entry, Bundle bundle) {
        ProducerCode producerCode = (ProducerCode)entry.getValue();
        PolicyRole policyRole = (PolicyRole)entry.getKey();
        return this.createProducerCodeRoleEntry(bundle, producerCode, policyRole);
    }

    private ProducerCodeRoleEntry createProducerCodeRoleEntry(Bundle bundle, ProducerCode producerCode, PolicyRole policyRole) {
        ProducerCodeRoleEntry roleEntry = (ProducerCodeRoleEntry)BCEntities.create(ProducerCodeRoleEntry.TYPE, producerCode.getCurrency(), bundle);
        InternalMethods.asProducerCodeRoleEntryInternal(roleEntry).setRole(policyRole);
        roleEntry.setProducer(producerCode.getProducer());
        roleEntry.setProducerCode(producerCode);
        return roleEntry;
    }

    private InvoicingOverrider getInvoicingOverrider() {
        if (this._invoicingOverrider == null) {
            this._invoicingOverrider = new InvoicingOverrider();
            this.addPopulator(2147483646, new BeanPopulator<PolicyPeriod>() {
                public void execute(PolicyPeriod policyPeriod) {
                    policyPeriod.updateWith(IssuanceBuilder.this._invoicingOverrider);
                }
            });
        }

        return this._invoicingOverrider;
    }

    public IssuanceBuilder withProducerCodeNewlyCreatedPrimaryOnExistingProducer(PayableCriteria payableCriteria, BigDecimal rate, Producer producer) {
        ProducerCode producerCode = (ProducerCode)((ProducerCodeBuilder)(new ProducerCodeBuilder()).withCurrency(producer.getCurrency())).onProducer(producer).withCommissionPlanNewlyCreatedWithPrimaryRate(payableCriteria, rate).create();
        return this.withProducerCode(PolicyRole.TC_PRIMARY, producerCode);
    }

    public static enum HasCurrency {
        YES,
        NO;
    }

    private class ProducerCodeCreationPlan {
        private PayableCriteria payableCriteria;
        private BigDecimal rate;
        private PolicyRole role;

        public ProducerCodeCreationPlan(PayableCriteria payableCriteria, BigDecimal rate, PolicyRole role) {
            this.payableCriteria = payableCriteria;
            this.rate = rate;
            this.role = role;
        }

        public ProducerCode generateProducerCode(Bundle bundle, Currency currency) {
            ProducerCodeBuilder var10000 = new ProducerCodeBuilder();
            String var10001 = BCDataBuilder.getRandomWord();
            return (ProducerCode)((ProducerCodeBuilder)var10000.withCode(var10001 + UniqueKeyGenerator.get().nextInteger()).withCurrency(currency)).onDefaultProducer().withCommissionPlanNewlyCreatedWithRate(this.role, this.payableCriteria, this.rate).create(bundle);
        }
    }
}
