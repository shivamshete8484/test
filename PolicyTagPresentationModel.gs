package za.co.santam.pc.ui.policyperiod

uses gw.api.path.Paths
uses gw.api.database.Query
uses gw.api.database.QuerySelectColumns
uses gw.api.database.Relop
uses gw.api.productmodel.Product
uses za.co.santam.pc.ui.IPresentationModel
uses za.co.santam.pc.ui.policyperiod.dataclasses.PolicyTagDefinitionUI
uses za.co.santam.pc.ui.policyperiod.dataclasses.PolicyTagOfferingData
uses za.co.santam.pc.ui.policyperiod.dataclasses.PolicyTagProductData

class PolicyTagPresentationModel implements IPresentationModel {

 private var _allProductDatas : ArrayList<PolicyTagProductData>
 private var _unCommittedPolicyTagDefinitionUI : ArrayList<PolicyTagDefinitionUI>
 private var _viewRetired : boolean as readonly ViewRetired = false

 construct() {
 }

 construct(loadProducts : boolean) {
   var products = gw.api.productmodel.ProductLookup.getAll().sort()
   _allProductDatas = buildProductDatas(products)
 }

 /**
  * Associates a Blank PolicyTag with a PolicyPeriod.  A given PolicyPeriod can only have
  * a single Tag, thus attempting to add a second Tag, the method ignores the request.
  *
  * @param period to which the Tag is to be associated
  * @return the new blank Tag / null
  */
 function addNewPolicyTag(period : PolicyPeriod) : PolicyTag_Ext {
   var policyTag : PolicyTag_Ext
   if (not period.PolicyTag_Ext.HasElements) {
     policyTag = new PolicyTag_Ext(period)
   }

   return policyTag
 }


 /**
  * Adds the BI-Rule associated with the PolicyTagDefinition_Ext to the PolicyTag_Ext on selection of a Tag
  *
  * @param policyTag_Ext PolicyTag_Ext to be updated with the BI_Rule
  * @param validTagList  List of the possible PolicyTagDefinition_Exts to be searched
  */
 function addBIRuleToPolicyTag(policyTag_Ext : PolicyTag_Ext, validTagList : List<PolicyTagDefinition_Ext>) : void {
   if (policyTag_Ext != null) {
     var biRule = validTagList?.firstWhere(\policyTagDef -> policyTagDef.PolicyTag == policyTag_Ext.PolicyPeriodTag_Ext)?.BI_Rule
     if (biRule != null) {
       policyTag_Ext.BI_Rule = biRule
     }
   }
 }


 /**
  * Loads a list of qualifying PolicyTags for the given PolicyPeriod, based on Product and Offering.
  *
  * @param policyPeriod to use as qualifier
  * @return a list of PolicyPeriodTag_Ext available to this PolicyPeriod
  */
 function loadValidTagsForPolicy(policyPeriod : PolicyPeriod) : List<PolicyTagDefinition_Ext> {
   var filteredList : List<PolicyTagDefinition_Ext>
   var product = policyPeriod.Policy.Product
   var Offering = policyPeriod.Offering
   var effectiveDate = policyPeriod.EditEffectiveDate

   filteredList = Query.make(PolicyTagDefinition_Ext)
       .or(\orProduct -> {
         orProduct.compareIgnoreCase(PolicyTagDefinition_Ext#ProductCodeIdentifier, Relop.Equals, product.CodeIdentifier)
         orProduct.compare(PolicyTagDefinition_Ext#ProductCodeIdentifier, Relop.Equals, null)
       })
       .or(\orOffering -> {
         orOffering.compareIgnoreCase(PolicyTagDefinition_Ext#OfferingCodeIdentifier, Relop.Equals, Offering.CodeIdentifier)
         orOffering.compare(PolicyTagDefinition_Ext#OfferingCodeIdentifier, Relop.Equals, null)
       })
       .and(\activeDate -> {
         activeDate.compare(PolicyTagDefinition_Ext#EffectiveStartDate, Relop.LessThanOrEquals, effectiveDate)
         activeDate.compare(PolicyTagDefinition_Ext#EffectiveEndDate, Relop.GreaterThanOrEquals, effectiveDate)
       })
       .select()
       .orderBy(QuerySelectColumns.path(Paths.make(PolicyTagDefinition_Ext#PolicyTag)))
       .toList()

   return filteredList
 }


 /**
  * Loads all currently defined TagDefinitions from the DB and converts it to a list of
  * PolicyTagDefinitionUI, which is list view displayable friendly
  *
  * @return a List of all definitions in PolicyTagDefinitionUI type
  */
 function loadAllCurrentTagDefinitions() : List<PolicyTagDefinitionUI> {
   var tagUIList = new ArrayList<PolicyTagDefinitionUI>()
   var tagDefinitionList = Query.make(PolicyTagDefinition_Ext)
       .withFindRetired(_viewRetired)
       .select()

       .orderBy(QuerySelectColumns.path(Paths.make(PolicyTagDefinition_Ext#PolicyTag)))
       .thenBy(QuerySelectColumns.path(Paths.make(PolicyTagDefinition_Ext#ProductCodeIdentifier)))
       .thenBy(QuerySelectColumns.path(Paths.make(PolicyTagDefinition_Ext#OfferingCodeIdentifier)))

   foreach (tagDefinition in tagDefinitionList) {
     tagUIList.add(new PolicyTagDefinitionUI(tagDefinition))
   }

   return tagUIList
 }


 /**
  * Enables of Disables the loading of Retired PolicyTagDefinition_Ext
  */
 function toggleRetired() : void {
   _viewRetired = !_viewRetired
 }


 /**
  * This method searches both committed and uncommitted PolicyTagDefinitions for matches.
  * It uses PolicyPeriodTag_Ext, ProductCodeIdentifier, Start and End date, to determine
  * if a definition already exists.
  *
  * @param policyTagUI        Current Tag Rule Definition being edited in the UI
  * @param includeProduct     If ProductCodeIdentifier should be used in the search.
  *                           False - Returns all hits for the tag.
  *                           True - Refines hits by limiting it to the current ProductCodeIdentifier
  * @param currentDefinitions List of current committed Tag Rule Definitions
  * @return A list of PolicyTagDefinitionUI containing all the matches found
  */
 private function findInTagDefinitionList(policyTagUI : PolicyTagDefinitionUI, includeProduct : boolean, currentDefinitions : List<PolicyTagDefinitionUI>) : List<PolicyTagDefinitionUI> {
   var foundList = new ArrayList<PolicyTagDefinitionUI>()
   if (_unCommittedPolicyTagDefinitionUI?.Count > 0) {
     currentDefinitions.addAll(_unCommittedPolicyTagDefinitionUI)
   }

   foreach (definedTag in currentDefinitions) {
     if (definedTag != policyTagUI) {
       if (!definedTag.Retired) {
         if (definedTag.PolicyTag == policyTagUI.PolicyTag) {
           if ((definedTag.EffectiveStartDate <= policyTagUI.EffectiveStartDate and
               definedTag.EffectiveEndDate >= policyTagUI.EffectiveStartDate) or
               (definedTag.EffectiveStartDate <= policyTagUI.EffectiveEndDate and
                   definedTag.EffectiveEndDate >= policyTagUI.EffectiveEndDate) or
               (definedTag.EffectiveStartDate >= policyTagUI.EffectiveStartDate and
                   definedTag.EffectiveEndDate <= policyTagUI.EffectiveEndDate)) {
             if (definedTag.ProductCodeIdentifier == null) {
               foundList.add(definedTag)
               break
             }
             if (includeProduct) {
               if (definedTag.ProductCodeIdentifier == policyTagUI.ProductCodeIdentifier) {
                 foundList.add(definedTag)
               }
             } else {
               foundList.add(definedTag)
             }
           }
         }
       }
     }
   }
   return foundList
 }


 /**
  * Loads an in Memory List of all Available Products in the PM
  *
  * @param products List of products to build the Memory List from
  * @return List of PolicyTagProductData representing all the Products
  */
 private function buildProductDatas(products : List<Product>) : ArrayList<PolicyTagProductData> {
   var productDatas = new ArrayList<PolicyTagProductData>()

   foreach (product in products) {
     productDatas.add(new PolicyTagProductData(product))
   }

   return productDatas
 }


 /**
  * Build a list of Available Products for the UI, based on PolicyPeriodTag_Ext, Start,
  * End date and already defined Tag availabilities
  *
  * @param policyTagUI        Current Tag Rule Definition being edited in the UI
  * @param currentDefinitions List of current committed Tag Rule Definitions
  * @return List of Products to be displayed in the UI's dropdown
  */
 function retrieveAllValidProducts(policyTagUI : PolicyTagDefinitionUI, currentDefinitions : List<PolicyTagDefinitionUI>) : ArrayList<PolicyTagProductData> {
   var productDatas = new ArrayList<PolicyTagProductData>()
   if (policyTagUI.PolicyTag != null and
       policyTagUI.EffectiveStartDate != null) {
     var foundList = findInTagDefinitionList(policyTagUI, false, currentDefinitions)

     //We found nothing, thus the wildcard can be included
     if (foundList.Count == 0) {
       productDatas.add(new PolicyTagProductData())
     }
     //If we found one and it's a wildcard, we have no other Offering options for this Product.
     //Only continue if it's not this case
     if (not(foundList.Count == 1 and
         foundList.First.ProductCodeIdentifier == null)) {
       productDatas.addAll(_allProductDatas)

       //We found one or more, and if the offering is a wildcard, no other Offering options
       //exists for that Product, thus remove it from the list
       foreach (foundWildCard in foundList) {
         if (foundWildCard.OfferingCodeIdentifier == null) {
           productDatas.removeWhere(\product -> product.ProductCodeIdentifier == foundWildCard.ProductCodeIdentifier)
         }
       }
     }
   }

   //Set the arrays used to for UI's dropdown display
   policyTagUI.Product = null
   policyTagUI.AvailableProducts = productDatas
   policyTagUI.AvailableOfferings = new ArrayList<PolicyTagOfferingData>()

   return productDatas
 }


 /**
  * Build a list of Available Offerings for the UI, based on PolicyPeriodTag_Ext,
  * Product, Start, End date and already defined Tag availabilities
  *
  * @param policyTagUI        Current Tag Rule Definition being edited in the UI
  * @param currentDefinitions List of current committed Tag Rule Definitions
  * @return List of Offerings to be displayed in the UI's dropdown
  */
 function retrieveAllValidOfferings(policyTagUI : PolicyTagDefinitionUI, currentDefinitions : List<PolicyTagDefinitionUI>) : ArrayList<PolicyTagOfferingData> {
   var offeringDatas = new ArrayList<PolicyTagOfferingData>()
   if (policyTagUI.ProductCodeIdentifier != null) {
     var foundList = findInTagDefinitionList(policyTagUI, true, currentDefinitions)

     //If we found one and it's a wildcard, we have no other Offering options.
     //Only continue if it's not this case
     if (not(foundList.Count == 1 and
         foundList.First.OfferingCodeIdentifier == null)) {
       //Add all the Offerings for this Product, removing those already defined.
       foreach (offering in policyTagUI.AllOfferingsOnProduct) {
         if (foundList.firstWhere(\offeringDefinition -> offeringDefinition.OfferingCodeIdentifier == offering.OfferingCodeIdentifier) == null) {
           offeringDatas.add(offering)
         }
       }
       //Remove all the wildcard Offerings
       if (foundList.Count > 0) {
         offeringDatas.removeWhere(\offering -> offering.OfferingCodeIdentifier == null)
       }
     }
   } else {
     offeringDatas.add(new PolicyTagOfferingData())
   }

   //Set the arrays used to for UI's dropdown display
   policyTagUI.AvailableOfferings = offeringDatas

   return offeringDatas
 }


 /**
  * Create a new Blank Tag Definition and assigns it to the in Memory, uncommitted definition list
  *
  * @return The new Blank Tag
  */
 function createNewTagDefinition() : PolicyTagDefinitionUI {
   var liveTagData = new PolicyTagDefinitionUI()
   _unCommittedPolicyTagDefinitionUI.add(liveTagData)
   return liveTagData
 }


 /**
  * Clear the in Memory, uncommitted definition list
  */
 function resetUnCommittedTagDefinitions() : void {
   _unCommittedPolicyTagDefinitionUI = new ArrayList<PolicyTagDefinitionUI>()
 }


 /**
  * Remove a uncommitted tag definition or, in case of a committed definition, mark it as retired.
  *
  * @param policyTagDefinitionUI The definition to be Removed/Retired
  * @return The definition to be Removed/Retired
  */
 function removeTagDefinition(policyTagDefinitionUI : PolicyTagDefinitionUI) : PolicyTagDefinitionUI {
   if (policyTagDefinitionUI.isNew) {
     _unCommittedPolicyTagDefinitionUI.removeWhere(\tagDefinitionUI -> tagDefinitionUI == policyTagDefinitionUI)
     policyTagDefinitionUI.removePolicyTagDefinitionFromBundle()
   } else {
     policyTagDefinitionUI.retirePolicyTagDefinition()
   }
   return policyTagDefinitionUI
 }


}