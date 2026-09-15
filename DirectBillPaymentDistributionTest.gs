package gw.servertest

uses gw.api.databuilder.DirectBillPaymentFixtureBuilder
uses gw.api.databuilder.IssuanceBuilder
uses gw.api.test.BCServerTestClassBase
uses gw.suites.BCExampleServerSuite
uses gw.testharness.v3.Suites

@Export
@Suites(BCExampleServerSuite.NAME)
class DirectBillPaymentDistributionTest extends BCServerTestClassBase {

  override function beforeClass() {
    this.setUpMutableSystemClock()
  }

  function testDirectBillAutoPaymentDistribution() {
    // Create a new policy period
    var account = new IssuanceBuilder()
        .createAndCommit().Account

    // Getting the first invoice
    var invoice = firstInvoiceOf(account)

    // Make a direct bill payment for the amount of the first invoice
    new DirectBillPaymentFixtureBuilder()
        .withPayerAccount(account)
        .incrementGrossPaymentAmount(invoice.Amount)
        .createFixture()

    assertThat(account.DefaultUnappliedFund.Balance)
        .as("UnappliedAmount was not set up as expected.").isEqualToIgnoringScale(invoice.Amount)

    // Advance the clock to the event date, make billed, distribute unapplied amount.
    makeBilledWithClockAdvanceToEventDate(invoice)

    assertThat(account.DefaultUnappliedFund.Balance)
        .as("Expected unappliedAmount to be zeroed out after payment distribution.")
        .isZero()

    invoice = firstInvoiceOf(account).refresh() as AccountInvoice
    assertThat(invoice.AmountDue)
        .as("Expected AmountDue to be zeroed out after payment distribution.")
        .isZero()
  }

}
