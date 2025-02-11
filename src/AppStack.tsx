import { HeaderTitleView } from '@Components/HeaderTitleView';
import { IoniconsHeaderButton } from '@Components/IoniconsHeaderButton';
import {
  AppStateEventType,
  AppStateType,
  TabletModeChangeData,
} from '@Lib/application_state';
import { useHasEditor, useIsLocked } from '@Lib/snjs_helper_hooks';
import { ScreenStatus } from '@Lib/status_manager';
import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import {
  createStackNavigator,
  StackNavigationProp,
} from '@react-navigation/stack';
import { Compose } from '@Screens/Compose/Compose';
import { Root } from '@Screens/Root';
import {
  SCREEN_COMPOSE,
  SCREEN_NOTES,
  SCREEN_VIEW_PROTECTED_NOTE,
} from '@Screens/screens';
import { MainSideMenu } from '@Screens/SideMenu/MainSideMenu';
import { NoteSideMenu } from '@Screens/SideMenu/NoteSideMenu';
import { ViewProtectedNote } from '@Screens/ViewProtectedNote/ViewProtectedNote';
import { ICON_MENU } from '@Style/icons';
import { ThemeService } from '@Style/theme_service';
import { getDefaultDrawerWidth } from '@Style/utils';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Dimensions, Keyboard, ScaledSize } from 'react-native';
import DrawerLayout, {
  DrawerState,
} from 'react-native-gesture-handler/DrawerLayout';
import { HeaderButtons, Item } from 'react-navigation-header-buttons';
import { ThemeContext } from 'styled-components';
import { HeaderTitleParams } from './App';
import { ApplicationContext } from './ApplicationContext';
import { ModalStackNavigationProp } from './ModalStack';

type AppStackNavigatorParamList = {
  [SCREEN_NOTES]: HeaderTitleParams;
  [SCREEN_COMPOSE]: HeaderTitleParams | undefined;
  [SCREEN_VIEW_PROTECTED_NOTE]: {
    onPressView: () => void;
  };
};

export type AppStackNavigationProp<
  T extends keyof AppStackNavigatorParamList
> = {
  navigation: CompositeNavigationProp<
    ModalStackNavigationProp<'AppStack'>['navigation'],
    StackNavigationProp<AppStackNavigatorParamList, T>
  >;
  route: RouteProp<AppStackNavigatorParamList, T>;
};

const AppStack = createStackNavigator<AppStackNavigatorParamList>();

export const AppStackComponent = (
  props: ModalStackNavigationProp<'AppStack'>
) => {
  // Context
  const application = useContext(ApplicationContext);
  const theme = useContext(ThemeContext);
  const [isLocked] = useIsLocked();
  const [hasEditor] = useHasEditor();

  // State
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));
  const [isInTabletMode, setIsInTabletMode] = useState(
    () => application?.getAppState().isInTabletMode
  );
  const [notesStatus, setNotesStatus] = useState<ScreenStatus>();
  const [composeStatus, setComposeStatus] = useState<ScreenStatus>();
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false);

  // Ref
  const drawerRef = useRef<DrawerLayout>(null);
  const noteDrawerRef = useRef<DrawerLayout>(null);

  useEffect(() => {
    const removeObserver = application
      ?.getAppState()
      .addStateChangeObserver(event => {
        if (event === AppStateType.EditorClosed) {
          noteDrawerRef.current?.closeDrawer();
          if (!isInTabletMode && props.navigation.canGoBack()) {
            props.navigation.popToTop();
          }
        }
      });

    return removeObserver;
  }, [application, props.navigation, isInTabletMode]);

  useEffect(() => {
    const removeObserver = application
      ?.getStatusManager()
      .addHeaderStatusObserver(messages => {
        setNotesStatus(messages[SCREEN_NOTES]);
        setComposeStatus(messages[SCREEN_COMPOSE]);
      });

    return removeObserver;
  }, [application, isInTabletMode]);

  useEffect(() => {
    const updateDimensions = ({ window }: { window: ScaledSize }) => {
      setDimensions(window);
    };

    Dimensions.addEventListener('change', updateDimensions);

    return () => Dimensions.removeEventListener('change', updateDimensions);
  }, []);

  useEffect(() => {
    const remoteTabletModeSubscription = application
      ?.getAppState()
      .addStateEventObserver((event, data) => {
        if (event === AppStateEventType.TabletModeChange) {
          const eventData = data as TabletModeChangeData;
          if (eventData.new_isInTabletMode && !eventData.old_isInTabletMode) {
            setIsInTabletMode(true);
          } else if (
            !eventData.new_isInTabletMode &&
            eventData.old_isInTabletMode
          ) {
            setIsInTabletMode(false);
          }
        }
      });

    return remoteTabletModeSubscription;
  }, [application]);

  const handleDrawerStateChange = useCallback(
    (newState: DrawerState, drawerWillShow: boolean) => {
      if (newState !== 'Idle' && drawerWillShow) {
        application?.getAppState().onDrawerOpen();
      }
    },
    [application]
  );

  return (
    <DrawerLayout
      ref={drawerRef}
      drawerWidth={getDefaultDrawerWidth(dimensions)}
      drawerPosition={'left'}
      drawerType="slide"
      drawerLockMode={
        hasEditor && !isInTabletMode ? 'locked-closed' : 'unlocked'
      }
      onDrawerStateChanged={handleDrawerStateChange}
      renderNavigationView={() =>
        !isLocked && <MainSideMenu drawerRef={drawerRef.current} />
      }
    >
      <DrawerLayout
        ref={noteDrawerRef}
        drawerWidth={getDefaultDrawerWidth(dimensions)}
        onDrawerStateChanged={handleDrawerStateChange}
        onDrawerOpen={() => setNoteDrawerOpen(true)}
        onDrawerClose={() => setNoteDrawerOpen(false)}
        drawerPosition={'right'}
        drawerType="slide"
        drawerLockMode={hasEditor ? 'unlocked' : 'locked-closed'}
        renderNavigationView={() =>
          hasEditor && (
            <NoteSideMenu
              drawerOpen={noteDrawerOpen}
              drawerRef={noteDrawerRef.current}
            />
          )
        }
      >
        <AppStack.Navigator
          screenOptions={() => ({
            headerStyle: {
              backgroundColor: theme.stylekitContrastBackgroundColor,
            },
            headerTintColor: theme.stylekitInfoColor,
            headerTitle: ({ children }) => {
              return <HeaderTitleView title={children || ''} />;
            },
          })}
          initialRouteName={SCREEN_NOTES}
        >
          <AppStack.Screen
            name={SCREEN_NOTES}
            options={({ route }) => ({
              title: 'All notes',
              headerTitle: ({ children }) => {
                const screenStatus = isInTabletMode
                  ? composeStatus || notesStatus
                  : notesStatus;

                const title = route.params?.title ?? (children || '');
                const subtitle = [screenStatus?.status, route.params?.subTitle]
                  .filter(x => !!x)
                  .join(' • ');

                return (
                  <HeaderTitleView
                    title={title}
                    subtitle={subtitle}
                    subtitleColor={screenStatus?.color}
                  />
                );
              },
              headerLeft: () => (
                <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
                  <Item
                    testID="drawerButton"
                    disabled={false}
                    title={''}
                    iconName={ThemeService.nameForIcon(ICON_MENU)}
                    onPress={() => {
                      Keyboard.dismiss();
                      drawerRef.current?.openDrawer();
                    }}
                  />
                </HeaderButtons>
              ),
              headerRight: () =>
                isInTabletMode &&
                hasEditor && (
                  <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
                    <Item
                      testID="noteDrawerButton"
                      disabled={false}
                      title={''}
                      iconName={ThemeService.nameForIcon(ICON_MENU)}
                      onPress={() => {
                        Keyboard.dismiss();
                        noteDrawerRef.current?.openDrawer();
                      }}
                    />
                  </HeaderButtons>
                ),
            })}
            component={Root}
          />
          <AppStack.Screen
            name={SCREEN_COMPOSE}
            options={({ route }) => ({
              headerTitle: ({ children }) => {
                return (
                  <HeaderTitleView
                    title={route.params?.title ?? (children || '')}
                    subtitle={composeStatus?.status}
                    subtitleColor={composeStatus?.color}
                  />
                );
              },
              headerRight: () =>
                !isInTabletMode && (
                  <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
                    <Item
                      testID="noteDrawerButton"
                      disabled={false}
                      title={''}
                      iconName={ThemeService.nameForIcon(ICON_MENU)}
                      onPress={() => {
                        Keyboard.dismiss();
                        noteDrawerRef.current?.openDrawer();
                      }}
                    />
                  </HeaderButtons>
                ),
            })}
            component={Compose}
          />
          <AppStack.Screen
            name={SCREEN_VIEW_PROTECTED_NOTE}
            options={() => ({
              title: 'View Protected Note',
            })}
            component={ViewProtectedNote}
          />
        </AppStack.Navigator>
      </DrawerLayout>
    </DrawerLayout>
  );
};
