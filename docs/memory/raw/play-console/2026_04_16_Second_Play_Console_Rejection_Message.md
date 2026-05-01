App Status: Rejected
Changes to your app weren’t published because of the policy issue(s) listed below. If you have an older version of your app, it will still be available on Google Play.

You can learn more about this issue and how to fix it on Play Console.

Go to Play Console
	
Issue found: Excessive data access for declared feature
We have reviewed your app's request to use Health Connect permissions. Your app appears to request access to more Health Connect data types than are necessary for its stated features, in violation of the "Minimum Scope" requirements of the Health Connect Permissions policy.

According to the policy, you must only request access to the permissions that are essential for implementing your product's features or services. Such access requests must be specific and limited to the data which is needed.

Based on our review, the following Health Connect permissions do not appear to be required for the features currently offered in your app:

ActiveCaloriesBurned
StepsCadence/Steps
TotalCaloriesBurned
RestingHeartRate
HeartRateVariabilityRmssd
Issue details

We found an issue in the following area(s):

Version code 7
To resolve this issue, follow these steps:

Review Permissions: Carefully evaluate each Health Connect permission your app requests and remove any that are not strictly necessary for your app's current functionality.
Update Manifest and Declaration: Remove the unnecessary permissions from your app's manifest and update your Play Console declaration accordingly.
Resubmit: After making these updates, please resubmit your app.
Please ensure your app only requests the minimum data types required to deliver the features and benefits to the user.

About the Health Connect by Android Permissions policy
Requests to access data through Health Connect must be clear and understandable. Health Connect may only be used in accordance with the applicable policies, terms and conditions, and for approved use cases as set forth in the Health Connect policy.