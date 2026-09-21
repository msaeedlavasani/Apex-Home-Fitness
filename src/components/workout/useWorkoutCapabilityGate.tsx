'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {CameraConsentBanner} from './CameraConsentBanner';
import {preparePoseHarness} from '@/services/cameraRuntime';
import {capabilityGateScopes, cameraCapabilityUnavailable, initialCapabilityGateState, type CapabilityGateState} from '@/lib/workout/capabilityGate';
import {capabilityUsableForSquat} from '@/lib/workout/executionStrategy';
import type {SessionExercise} from '@/lib/workout/sessionContracts';
import type {ConsentScope} from '@/lib/workout/consentEntity';

const CONSENT_VERSION = 1;

export function useWorkoutCapabilityGate(exercises: readonly SessionExercise[]) {
  const scopes = useMemo(() => capabilityGateScopes(exercises) as readonly ConsentScope[], [exercises]);
  const [state, setState] = useState<CapabilityGateState>(initialCapabilityGateState);

  useEffect(() => {
    let cancelled = false;
    const inspect = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) setState(cameraCapabilityUnavailable('camera-unavailable'));
        return;
      }
      try {
        const permission = navigator.permissions?.query
          ? await navigator.permissions.query({name: 'camera' as PermissionName})
          : null;
        if (cancelled) return;
        if (permission?.state === 'granted') {
          setState((current) => ({...current, status: 'INITIALIZING', consented: true, scopes}));
          try {
            setState((current) => ({...current, status: 'CALIBRATING'}));
            const readiness = await preparePoseHarness();
            if (!cancelled) setState({status: 'READY', capability: {...capabilityUsableForSquat(), ...readiness}, consented: true, scopes, reason: null});
          } catch (error) {
            if (!cancelled) setState(cameraCapabilityUnavailable(error instanceof Error ? error.message : 'camera-unavailable'));
          }
        } else if (!cancelled) {
          setState((current) => ({...current, status: 'CHOICE_REQUIRED', scopes, reason: permission?.state ?? 'camera-permission-required'}));
        }
      } catch (error) {
        if (!cancelled) setState((current) => ({...current, status: 'CHOICE_REQUIRED', scopes, reason: error instanceof Error ? error.message : 'camera-check-failed'}));
      }
    };
    void inspect();
    return () => { cancelled = true; };
  }, [scopes]);

  const chooseWithoutCamera = useCallback(() => {
    setState(cameraCapabilityUnavailable('user-declined-camera'));
  }, []);

  const enableCamera = useCallback(async (snapshot: {consented: boolean; scopes: readonly ConsentScope[]; version: number}) => {
    setState((current) => ({...current, status: 'INITIALIZING', consented: snapshot.consented, scopes: snapshot.scopes}));
    try {
      setState((current) => ({...current, status: 'CALIBRATING', consented: true, scopes: snapshot.scopes}));
      const readiness = await preparePoseHarness();
      setState({status: 'READY', capability: {...capabilityUsableForSquat(), ...readiness}, consented: true, scopes: snapshot.scopes, reason: null});
    } catch (error) {
      setState(cameraCapabilityUnavailable(error instanceof Error ? error.message : 'camera-initialization-failed'));
    }
  }, []);

  const gate = state.status === 'READY' ? null : (
    <CameraConsentBanner
      scopes={scopes}
      version={CONSENT_VERSION}
      onConsentChange={(snapshot) => { void enableCamera(snapshot); }}
      onStartWithoutCamera={chooseWithoutCamera}
    />
  );

  return {state, gate, chooseWithoutCamera};
}
