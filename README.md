# AWS CDK TypeScript project for ImageBuilder + Pipeline

## Why Ubuntu 18.04

* Ubuntu 18.04 is the latest LTS version of Ubuntu. It is supported until 2023. It is also the version of Ubuntu that is used by the AWS ImageBuilder.

* Because AWS OpsWorks supports Ubuntu 18.04, it is possible to use the same image for both OpsWorks and ImageBuilder.

## How to get the lastest Ubuntu 18.04 AMI

```bash
aws ssm get-parameters --profile telasa --names /aws/service/canonical/ubuntu/server/18.04/stable/current/amd64/hvm/ebs-gp2/ami-id --query 'Parameters[0].[Value]' --output text
```

## Project structure

The package code is located in the `lib` directory. The `bin` directory contains the entry point for the application.

| File | Description |
| --- | --- |
| `bin/cdk-image-builder.ts` | The entry point for the application. (Stack name for Ubuntu 18 `VPGoldenImage-1804`) |
| `lib/cdk-image-builder-stack.ts` | The main stack. |


## First time setup

requirement: Node.js 18.x or later

```bash
npm i 

```

## Before deploy

* Make sure you have manually edit the `lib/cdk-image-builder.ts` Line 17 & 18 semver version and bump minor version    

## CDK synth and deploy

```bash
npx cdk deploy --profile telasa --require-approval never -e "VPGoldenImage-1804" 
```

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
