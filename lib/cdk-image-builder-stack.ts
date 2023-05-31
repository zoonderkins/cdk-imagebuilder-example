import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as imagebuilder from 'aws-cdk-lib/aws-imagebuilder';
import { Construct } from 'constructs';
import { BasicOptions } from '../types';

class CustomError extends Error {
  constructor(public readonly code: number, message?: string) {
    super(message);
    Object.setPrototypeOf(this, CustomError.prototype);
  }

  public getErrorCode(): number {
    if (this.code === 1) {
      console.log("phpVersion is undefined");
      process.exit(1)
    }
    return this.code;
  }
}

export class CdkImageBuilderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, appProps: BasicOptions, props?: cdk.StackProps) {
    super(scope, id, props);

    let component: imagebuilder.CfnComponent;
    let receipe: imagebuilder.CfnImageRecipe;
    let instanceProfileRole: iam.Role;
    let instanceProfile: iam.CfnInstanceProfile;
    let distributionConfig: imagebuilder.CfnDistributionConfiguration;
    let infraConfig: imagebuilder.CfnInfrastructureConfiguration;
    let pipeline: imagebuilder.CfnImagePipeline;

    if (!appProps.phpVersion) throw new CustomError(1, "phpVersion is undefined");

    if (appProps.ubuntuVersion === "1804") {

      component = new imagebuilder.CfnComponent(this, 'VPComponent', {
        name: `VideoPass-${appProps.ubuntuVersion}-Component-`,
        version: appProps.componentVersion!,
        platform: 'Linux',
        data: `
        name: VPComponent
        description: Ubuntu ${appProps.ubuntuVersion} VideoPass Component
        schemaVersion: 1.0
        phases:
          - name: build
            steps:
              - name: InstallImageBasicDependencies
                action: ExecuteBash
                inputs:
                  commands:
                    - sed -i'' -e 's/.*requiretty.*//' /etc/sudoers
                    - echo "Install AWS Session Manager"
                    - systemctl stop snap.amazon-ssm-agent.amazon-ssm-agent.service
                    - snap refresh amazon-ssm-agent --channel=candidate
                    - systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service
                    - echo "Install AWS CLI"
                    - cd ~/ && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && ./aws/install && rm -r ./aws
                    - echo "Install Cloudwatch Agent"
                    - cd ~/ && wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb && dpkg -i ./amazon-cloudwatch-agent.deb && rm ./amazon-cloudwatch-agent.deb
                    - echo "Apt update and Upgrade"
                    - apt update -y && apt -y upgrade
                    - echo "Install Basic Dependencies"
                    - apt install -y software-properties-common python-software-properties build-essential screen ntp wget htop dnsutils nload ncdu curl jq zip git unzip
                    - echo "Install Perl Dependencies"
                    - apt install -y libwww-perl libjson-perl libhiredis-dev libcrypt-ssleay-perl libswitch-perl libhiredis-dev rsyslog --no-install-recommends
                    - echo "Install Python 3.9"
                    - add-apt-repository ppa:deadsnakes/ppa -y
                    - apt install -y python python-pip python3-pip python3.9
                    - echo "Install ppa:ondrej PHP, Gearman, Apache2"
                    - add-apt-repository ppa:ondrej/php -y
                    - add-apt-repository ppa:ondrej/pkg-gearman -y
                    - add-apt-repository ppa:ondrej/apache2 libapache2-mod-fastcgi -y
                    - echo "Install Apache2"
                    - apt install -y apache2
                    - echo "Install PHP 7"
                    - apt install -y php${appProps.phpVersion}-common php${appProps.phpVersion}-mcrypt php${appProps.phpVersion}-curl php${appProps.phpVersion}-mbstring php${appProps.phpVersion}-mysql php${appProps.phpVersion}-xml php${appProps.phpVersion}-cli php${appProps.phpVersion}-dev php${appProps.phpVersion}-fpm php${appProps.phpVersion}-gd php${appProps.phpVersion}-json php${appProps.phpVersion}-readline php${appProps.phpVersion}-soap php${appProps.phpVersion}-zip php${appProps.phpVersion}-bcmath php${appProps.phpVersion}-intl php${appProps.phpVersion}-geoip php${appProps.phpVersion}-sqlite php${appProps.phpVersion}-redis php${appProps.phpVersion}-gearman php${appProps.phpVersion}-memcached
                    - echo "Install Gearman"
                    - apt install -y libgearman-dev --no-install-recommends
                    - echo "Install Memcached"
                    - apt install -y memcached libmemcached-tools --no-install-recommends
                    - echo "Remove apt cache"
                    - apt -y autoremove --purge
                    - apt clean
                    - echo "Image build completed"
        `
      })

      receipe = new imagebuilder.CfnImageRecipe(this, 'VPImageRecipe', {
        name: `VideoPass-${appProps.ubuntuVersion}-Receipe`,
        parentImage: appProps.pureAmiId,
        version: appProps.componentVersion,
        components: [{
          componentArn: component.attrArn
        }],
      })

      instanceProfileRole = new iam.Role(this, 'VPRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        roleName: `VideoPass-${appProps.ubuntuVersion}-UbuntuEc2Role`,
      })

      instanceProfile = new iam.CfnInstanceProfile(this, 'VPInstanceProfile', {
        instanceProfileName: `VideoPass-${appProps.ubuntuVersion}-Ec2InstanceProfile`,
        roles: [instanceProfileRole.roleName],
        path: "/executionServiceEC2Role/"
      })

      infraConfig = new imagebuilder.CfnInfrastructureConfiguration(this, 'VPInfrastructureConfiguration', {
        name: 'VPInfrastructureConfiguration',
        instanceProfileName: instanceProfile.instanceProfileName as string,
        instanceTypes: ['t3.xlarge'],
      })

      distributionConfig = new imagebuilder.CfnDistributionConfiguration(this, 'VPDistributionConfiguration', {
        name: 'VPDistributionConfiguration',
        distributions: [
          {
            region: 'ap-northeast-1',
            amiDistributionConfiguration: {
              name: `Videopass-${appProps.ubuntuVersion}-GoldenImage-{{imagebuilder:buildDate}}`,
            }
          }
        ]
      });

      pipeline = new imagebuilder.CfnImagePipeline(this, 'VPImagePipeline', {
        name: 'VideoPassImagePipeline',
        imageRecipeArn: receipe!.attrArn,
        infrastructureConfigurationArn: infraConfig!.attrArn,
        distributionConfigurationArn: distributionConfig!.attrArn,
      })

    }

    else if (appProps.ubuntuVersion === "2204") {
      component = new imagebuilder.CfnComponent(this, 'VP22Component', {
        name: `VideoPass-${appProps.ubuntuVersion}-Component`,
        version: appProps.componentVersion!,
        platform: 'Linux',
        data: `
        name: VPComponent
        description: Ubuntu 22.04 VideoPass Golden Image Component
        schemaVersion: 1.0
        phases:
          - name: build
            steps:
              - name: InstallImageBasicDependencies
                action: ExecuteBash
                inputs:
                  commands:
                    - sed -i'' -e 's/.*requiretty.*//' /etc/sudoers
                    - systemctl stop snap.amazon-ssm-agent.amazon-ssm-agent.service
                    - snap refresh amazon-ssm-agent --channel=candidate
                    - systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service
                    - apt update -y && apt install -y python python-pip python3-pip python3 ntp wget htop dnsutils nload ncdu curl jq zip unzip git libwww-perl libcrypt-ssleay-perl libswitch-perl libhiredis-dev
                    - cd ~/ && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && ./aws/install && rm -r ./aws
                    - cd ~/ && wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb && dpkg -i ./amazon-cloudwatch-agent.deb && rm ./amazon-cloudwatch-agent.deb
                    - echo "Remove apt cache"
                    - apt -y autoremove --purge
                    - apt clean
                    - echo "Image build completed"
      `
      })
      receipe = new imagebuilder.CfnImageRecipe(this, 'VP22ImageRecipe', {
        name: `VideoPass-${appProps.ubuntuVersion}-Receipe`,
        parentImage: appProps.pureAmiId,
        version: appProps.version,
        components: [{
          componentArn: component.attrArn
        }],
      })

      instanceProfileRole = new iam.Role(this, 'VP22Role', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        roleName: `VideoPass-${appProps.ubuntuVersion}-UbuntuEc2Role`,
      })

      instanceProfile = new iam.CfnInstanceProfile(this, 'VP22InstanceProfile', {
        instanceProfileName: `VideoPass-${appProps.ubuntuVersion}-Ec2InstanceProfile`,
        roles: [instanceProfileRole.roleName],
        path: "/executionServiceEC2Role/"
      })
      infraConfig = new imagebuilder.CfnInfrastructureConfiguration(this, 'VP22InfrastructureConfiguration', {
        name: 'VP22InfrastructureConfiguration',
        instanceProfileName: instanceProfile.instanceProfileName as string,
        instanceTypes: ['t3.xlarge'],
      })
      distributionConfig = new imagebuilder.CfnDistributionConfiguration(this, 'VP22DistributionConfiguration', {
        name: 'VP22DistributionConfiguration',
        distributions: [
          {
            region: 'ap-northeast-1',
            amiDistributionConfiguration: {
              name: `Videopass-${appProps.ubuntuVersion}-GoldenImage-{{imagebuilder:buildDate}}`,
            }
          }
        ]
      });
      pipeline = new imagebuilder.CfnImagePipeline(this, 'VP22ImagePipeline', {
        name: 'VideoPass22ImagePipeline',
        imageRecipeArn: receipe!.attrArn,
        infrastructureConfigurationArn: infraConfig!.attrArn,
        distributionConfigurationArn: distributionConfig!.attrArn,
      })
    }

    receipe!.addDependsOn(component!)
    infraConfig!.addDependsOn(instanceProfile!)
    instanceProfileRole!.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'))
    instanceProfileRole!.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('EC2InstanceProfileForImageBuilder'))

    pipeline!.addDependsOn(distributionConfig!)
    pipeline!.addDependsOn(receipe!)
    pipeline!.addDependsOn(infraConfig!)

  }
}
