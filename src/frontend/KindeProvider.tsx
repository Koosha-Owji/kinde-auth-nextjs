"use client";
import { KindeProvider as KindeReactProvider, TimeoutActivityType, ActivityTimeoutConfig } from "@kinde-oss/kinde-auth-react";
import React, { useMemo } from "react";
import { useSessionSync } from "./hooks/internal/use-session-sync";
import * as store from "./store";
import { storageSettings } from "@kinde-oss/kinde-auth-react/utils";
import { config as sdkConfig} from "../config/index";

type KindeProviderProps = {
  children: React.ReactNode;
  waitForInitialLoad?: boolean;
  activityTimeout?: ActivityTimeoutConfig;
};

export const KindeProvider = ({
  children,
  waitForInitialLoad,
  activityTimeout,
}: KindeProviderProps) => {
  const { loading, config, refreshHandler } = useSessionSync();

  const wrappedActivityTimeout = useMemo(() => {
    if (!activityTimeout) return undefined;

    return {
      ...activityTimeout,
      onTimeout: async (type: TimeoutActivityType) => {
        // Call user's callback first
        try {
          await activityTimeout.onTimeout?.(type);
        } catch (error) {
          if (sdkConfig.isDebugMode) {
            console.error("[KindeProvider] onTimeout callback failed:", error);
          }
        }

        // Redirect to revoke tokens and logout from Kinde
        if (type === TimeoutActivityType.timeout) {
          window.location.href = `${sdkConfig.apiPath}/revoke-tokens`;
        }
      },
    };
  }, [activityTimeout]);

  storageSettings.onRefreshHandler = refreshHandler;
  if (loading && waitForInitialLoad) return null;
  if (!config && !loading) {
    console.error("[KindeProvider] Failed to fetch config");
    return null;
  }

  return (
    <KindeReactProvider
      clientId={config?.clientId ?? ""}
      domain={config?.issuerUrl ?? ""}
      redirectUri={config?.redirectUrl ?? ""}
      store={store.clientStorage}
      activityTimeout={wrappedActivityTimeout}
      forceChildrenRender
    >
      {children}
    </KindeReactProvider>
  );
};
