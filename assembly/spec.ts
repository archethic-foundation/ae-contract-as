@json
class UpgradeOpts {
  from!: String;
}

@json
export class Spec {
  version: u32 = 2;
  triggers: Map<string, Trigger> = new Map<string, Trigger>();
  customErrors: Map<u32, string> = new Map<u32, string>();
  publicFunctions: string[] = [];
  upgradeOpts: UpgradeOpts | null;

  addTrigger(
    functionName: string,
    type: TriggerType,
    typeArg: string | null = null,
  ): Spec {
    this.triggers.set(functionName, {
      type: type,
      argument: typeArg,
    });

    return this;
  }

  addCustomError(errCode: u32, errDescription: string = ""): Spec {
    this.customErrors.set(errCode, errDescription);
    return this;
  }

  addPublicFunction(name: string): Spec {
    this.publicFunctions.push(name);
    return this;
  }

  setUpgradable(opts: UpgradeOpts): Spec {
    this.upgradeOpts = opts;
    return this;
  }
}

@json
export class Trigger {
  type: TriggerType;
  @omitnull()
  argument: string | null;
}

export const enum TriggerType {
  Transaction,
  DateTime,
  Interval,
  Oracle,
}
