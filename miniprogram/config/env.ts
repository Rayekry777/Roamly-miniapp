type EnvVersion = "develop" | "trial" | "release";
interface EnvironmentConfig {
  apiBaseUrl: string;
  assetBaseUrl: string;
}

const environments: Record<EnvVersion, EnvironmentConfig> = {
  develop: {
    apiBaseUrl: "http://127.0.0.1:8081",
    assetBaseUrl: "http://127.0.0.1:8081",
  },
  trial: {
    apiBaseUrl: "https://test-api.example.com/api",
    assetBaseUrl: "https://test-api.example.com",
  },
  release: {
    apiBaseUrl: "https://api.example.com/api",
    assetBaseUrl: "https://api.example.com",
  },
};

const deviceDevelopEnvironment: EnvironmentConfig = {
  apiBaseUrl: "http://192.168.2.109:8081",
  assetBaseUrl: "http://192.168.2.109:8081",
};

export function getEnvironment(): EnvironmentConfig {
  let version: EnvVersion = "develop";
  try {
    version = wx.getAccountInfoSync().miniProgram.envVersion || "develop";
  } catch {
    version = "develop";
  }
  if (version === "develop") {
    try {
      if (wx.getDeviceInfo().platform !== "devtools")
        return deviceDevelopEnvironment;
    } catch {
      /* 使用开发者工具地址 */
    }
  }
  return environments[version];
}
