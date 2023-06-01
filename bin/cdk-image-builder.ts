import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkImageBuilderStack } from '../lib/cdk-image-builder-stack';
import { BasicOptions } from '../types';
const app = new cdk.App();

const ubuntu2204Props: BasicOptions = {
   version: "1.0.0",
   componentVersion: "1.0.0",
   projectName: "VP",
   pureAmiId: "ami-02ae3dea04b2cb88e",
   ubuntuVersion: "2204",
   phpVersion: "7.2",
}

// aws ssm get-parameters --profile telasa --names /aws/service/canonical/ubuntu/server/18.04/stable/current/amd64/hvm/ebs-gp2/ami-id --query 'Parameters[0].[Value]' --output text
const ubuntu1804Props: BasicOptions = {
   version: "1.1.5",
   componentVersion: "1.1.5",
   projectName: "VP",
   pureAmiId: "ami-0e668b41786fecce6",
   ubuntuVersion: "1804",
   phpVersion: "7.2",
}

// cdk deploy --profile telasa --require-approval never -e "VPGoldenImage-2204" 

new CdkImageBuilderStack(app, `${ubuntu2204Props.projectName}GoldenImage-2204`, ubuntu2204Props, {
   env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: 'ap-northeast-1'
   },
});

// cdk deploy --profile telasa --require-approval never -e "VPGoldenImage-1804" 

new CdkImageBuilderStack(app, `${ubuntu1804Props.projectName}GoldenImage-1804`, ubuntu1804Props, {
   env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: 'ap-northeast-1'
   },
});
