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

    let dotPhpVersion = appProps.phpVersion.replace("-", ".");
    let component: imagebuilder.CfnComponent;
    let receipe: imagebuilder.CfnImageRecipe;
    let instanceProfileRole: iam.Role;
    let instanceProfile: iam.CfnInstanceProfile;
    let distributionConfig: imagebuilder.CfnDistributionConfiguration;
    let infraConfig: imagebuilder.CfnInfrastructureConfiguration;
    let pipeline: imagebuilder.CfnImagePipeline;

    if (!appProps.phpVersion) throw new CustomError(1, "phpVersion is undefined");

    if (appProps.ubuntuVersion === "1804") {

      component = new imagebuilder.CfnComponent(this, `VPComponent-${appProps.phpVersion}`, {
        name: `VideoPass-${appProps.ubuntuVersion}-${appProps.phpVersion}-Component`,
        version: appProps.componentVersion!,
        platform: 'Linux',
        data: `
        name: VPComponent
        description: Ubuntu ${appProps.ubuntuVersion}-${appProps.phpVersion} VideoPass Component
        schemaVersion: 1.0
        phases:
          - name: build
            steps:
              - name: InstallImageBasicDependencies
                action: ExecuteBash
                inputs:
                  commands:
                    - sed -i'' -e 's/.*requiretty.*//' /etc/sudoers
                    - echo "Apt update and Upgrade"
                    - apt update -y && apt -y upgrade
                    - echo "Install zip and Unzip"
                    - apt install -y zip unzip
                    - echo "Which zip and unzip"
                    - which unzip && which zip
                    - echo "Install Basic Dependencies"
                    - apt install -y software-properties-common build-essential
                    - echo "Install other tools"
                    - apt install -y screen ntp wget htop dnsutils nload ncdu curl jq git
                    - echo "Install Perl Dependencies"
                    - apt install -y libwww-perl libjson-perl libhiredis-dev libcrypt-ssleay-perl libswitch-perl libhiredis-dev rsyslog
                    - echo "Install AWS Session Manager"
                    - systemctl stop snap.amazon-ssm-agent.amazon-ssm-agent.service
                    - snap refresh amazon-ssm-agent --channel=candidate
                    - systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service
                    - echo "Install AWS CLI"
                    - cd ~/ && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && ./aws/install && rm -r ./aws
                    - echo "Install Cloudwatch Agent"
                    - cd ~/ && wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb && dpkg -i ./amazon-cloudwatch-agent.deb && rm ./amazon-cloudwatch-agent.deb
                    - echo "Make python 3.9"
                    - py_version=3.9.17
                    - apt install -y gcc make openssl libssl-dev zlib1g zlib1g-dev libffi-dev
                    - curl -O https://www.python.org/ftp/python/${py_version}/Python-${py_version}.tgz
                    - tar -zxvf Python-${py_version}.tgz
                    - cd Python-${py_version}
                    - ./configure --prefix=/usr/local/python/Python-${py_version} --with-ensurepip=install
                    - make
                    - make install
                    - cd ..
                    - rm -rf Python-${py_version} Python-${py_version}.tgz
                    - ln -s /usr/local/python/Python-${py_version}/bin/* /usr/local/bin/
                    - echo "Finish python 3.9 installation"
                    - echo "Install ppa:ondrej PHP, Gearman, Apache2"
                    - add-apt-repository ppa:ondrej/php -y
                    - add-apt-repository ppa:ondrej/pkg-gearman -y
                    - add-apt-repository ppa:ondrej/apache2 libapache2-mod-fastcgi -y
                    - echo "Install Apache2"
                    - apt install -y apache2
                    - echo "Install PHP 7"
                    - apt install -y php${dotPhpVersion}-common php${dotPhpVersion}-curl php${dotPhpVersion}-mbstring php${dotPhpVersion}-mysql php${dotPhpVersion}-xml php${dotPhpVersion}-cli php${dotPhpVersion}-dev php${dotPhpVersion}-fpm php${dotPhpVersion}-gd php${dotPhpVersion}-json php${dotPhpVersion}-readline php${dotPhpVersion}-soap php${dotPhpVersion}-zip php${dotPhpVersion}-bcmath php${dotPhpVersion}-intl php${dotPhpVersion}-geoip php${dotPhpVersion}-sqlite php${dotPhpVersion}-redis php${dotPhpVersion}-gearman php${dotPhpVersion}-memcached
                    - echo "Install Gearman"
                    - apt install -y libgearman-dev --no-install-recommends
                    - echo "Install Memcached"
                    - apt install -y memcached libmemcached-tools --no-install-recommends
                    - echo "Try install PHP mcrypt"
                    - apt install -y php${dotPhpVersion}-mcrypt
                    - echo "Remove apt cache"
                    - apt -y autoremove --purge
                    - apt clean
                    - echo "Start download IDS Agent"
                    - mkdir -p /root/ids-agent && cd /root/ids-agent
                    - wget https://files.trendmicro.com/products/deepsecurity/en/20.0/Agent-Ubuntu_18.04-20.0.0-7476.x86_64.zip
                    - unzip Agent-Ubuntu_18.04-20.0.0-7476.x86_64.zip
                    - rm -r *.dsp *.txt *.asc META-INF
                    - echo "Install IDS Agent"
                    - dpkg -i Agent-Core-Ubuntu_18.04-20.0.0-7476.x86_64.deb
                    - echo "Image build completed"
        `
      })

      receipe = new imagebuilder.CfnImageRecipe(this, `VPImageRecipe-${appProps.phpVersion}`, {
        name: `VideoPass-${appProps.ubuntuVersion}-${appProps.phpVersion}-Receipe`,
        parentImage: appProps.pureAmiId,
        version: appProps.componentVersion,
        components: [{
          componentArn: component.attrArn
        }],
      })

      instanceProfileRole = new iam.Role(this, `VPRole-${appProps.phpVersion}`, {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        roleName: `VideoPass-${appProps.ubuntuVersion}-${appProps.phpVersion}-UbuntuEc2Role`,
      })

      instanceProfile = new iam.CfnInstanceProfile(this, `VPInstanceProfile-${appProps.phpVersion}`, {
        instanceProfileName: `VideoPass-${appProps.ubuntuVersion}-${appProps.phpVersion}-Ec2InstanceProfile`,
        roles: [instanceProfileRole.roleName],
        path: "/executionServiceEC2Role/"
      })

      infraConfig = new imagebuilder.CfnInfrastructureConfiguration(this, `VPInfrastructureConfiguration-${appProps.phpVersion}`, {
        name: `VPInfrastructureConfiguration-${appProps.phpVersion}`,
        instanceProfileName: instanceProfile.instanceProfileName as string,
        instanceTypes: ['t3.xlarge'],
      })

      distributionConfig = new imagebuilder.CfnDistributionConfiguration(this, `VPDistributionConfiguration-${appProps.phpVersion}`, {
        name: `VPDistributionConfiguration-${appProps.phpVersion}`,
        distributions: [
          {
            region: props?.env?.region as string,
            amiDistributionConfiguration: {
              name: `Videopass-${appProps.ubuntuVersion}-${appProps.phpVersion}-GoldenImage-{{imagebuilder:buildDate}}`,
            }
          }
        ]
      });

      pipeline = new imagebuilder.CfnImagePipeline(this, `VPImagePipeline-${appProps.phpVersion}`, {
        name: `VideoPassImagePipeline-${appProps.phpVersion}`,
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
