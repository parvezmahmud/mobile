import { Chip } from '@Components/Chip';
import { AppStateEventType, AppStateType } from '@Lib/application_state';
import { useSignedIn } from '@Lib/snjs_helper_hooks';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ApplicationContext } from '@Root/ApplicationContext';
import { AppStackNavigationProp } from '@Root/AppStack';
import { SCREEN_NOTES } from '@Screens/screens';
import { CollectionSort, SNNote } from '@standardnotes/snjs';
import { ThemeServiceContext } from '@Style/theme_service';
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  FlatList,
  ListRenderItem,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IosSearchBar from 'react-native-search-bar';
import AndroidSearchBar from 'react-native-search-box';
import { ThemeContext } from 'styled-components/native';
import { NoteCell } from './NoteCell';
import {
  Container,
  HeaderContainer,
  LoadingContainer,
  LoadingText,
  SearchBarContainer,
  SearchOptionsContainer,
  styles,
} from './NoteList.styled';
import { OfflineBanner } from './OfflineBanner';

type Props = {
  onSearchChange: (text: string) => void;
  onSearchCancel: () => void;
  searchText: string;
  searchOptions: {
    selected: boolean;
    onPress: () => void;
    label: string;
  }[];
  onPressItem: (noteUuid: SNNote['uuid']) => void;
  selectedNoteId: string | undefined;
  sortType: CollectionSort;
  hideDates: boolean;
  hidePreviews: boolean;
  hideEditorIcon: boolean;
  decrypting: boolean;
  loading: boolean;
  hasRefreshControl: boolean;
  notes: SNNote[];
  refreshing: boolean;
  onRefresh: () => void;
  shouldFocusSearch: boolean;
  setShouldFocusSearch: Dispatch<SetStateAction<boolean>>;
};

export const NoteList = (props: Props) => {
  // Context
  const [signedIn] = useSignedIn();
  const application = useContext(ApplicationContext);
  const themeService = useContext(ThemeServiceContext);
  const theme = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [collapseSearchBarOnBlur, setCollapseSearchBarOnBlur] = useState(true);
  const [noteListScrolled, setNoteListScrolled] = useState(false);

  // Ref
  const opacityAnimationValue = useRef(new Animated.Value(0)).current;
  const marginTopAnimationValue = useRef(new Animated.Value(-40)).current;
  const iosSearchBarInputRef = useRef<IosSearchBar>(null);
  const androidSearchBarInputRef = useRef<typeof AndroidSearchBar>(null);
  const noteListRef = useRef<FlatList>(null);

  const navigation = useNavigation<
    AppStackNavigationProp<typeof SCREEN_NOTES>['navigation']
  >();

  const dismissKeyboard = () => {
    iosSearchBarInputRef.current?.blur();
  };

  useEffect(() => {
    const removeBlurScreenListener = navigation.addListener('blur', () => {
      setCollapseSearchBarOnBlur(false);
    });

    return removeBlurScreenListener;
  });

  useEffect(() => {
    const unsubscribeStateEventObserver = application
      ?.getAppState()
      .addStateEventObserver(state => {
        if (state === AppStateEventType.DrawerOpen) {
          dismissKeyboard();
        }
      });

    return unsubscribeStateEventObserver;
  }, [application]);

  const scrollListToTop = useCallback(() => {
    if (noteListScrolled && props.notes && props.notes.length > 0) {
      noteListRef.current?.scrollToIndex({ animated: false, index: 0 });
      setNoteListScrolled(false);
    }
  }, [noteListScrolled, props.notes]);

  useEffect(() => {
    const unsubscribeTagChangedEventObserver = application
      ?.getAppState()
      .addStateChangeObserver(event => {
        if (event === AppStateType.TagChanged) {
          scrollListToTop();
        }
      });

    return unsubscribeTagChangedEventObserver;
  }, [application, scrollListToTop]);

  const { shouldFocusSearch, searchText } = props;

  const focusSearch = useCallback(() => {
    setCollapseSearchBarOnBlur(true);

    if (shouldFocusSearch) {
      iosSearchBarInputRef.current?.focus();
      androidSearchBarInputRef.current?.focus(searchText);
    }
  }, [shouldFocusSearch, searchText]);

  useFocusEffect(focusSearch);

  useFocusEffect(
    useCallback(() => {
      return dismissKeyboard;
    }, [])
  );

  const onChangeSearchText = (text: string) => {
    props.onSearchChange(text);
    scrollListToTop();
  };

  const toggleSearchOptions = (showOptions: boolean) => {
    Animated.parallel([
      Animated.timing(opacityAnimationValue, {
        toValue: showOptions ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(marginTopAnimationValue, {
        toValue: showOptions ? 0 : -40,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const onSearchFocus = () => {
    toggleSearchOptions(true);
    props.setShouldFocusSearch(false);
  };

  const onSearchBlur = () => {
    toggleSearchOptions(false);
  };

  const onScroll = () => {
    setNoteListScrolled(true);
  };

  const renderItem: ListRenderItem<SNNote> | null | undefined = ({ item }) => {
    return (
      <NoteCell
        note={item}
        onPressItem={props.onPressItem}
        sortType={props.sortType}
        hideDates={props.hideDates}
        hidePreviews={props.hidePreviews}
        hideEditorIcon={props.hideEditorIcon}
        highlighted={item.uuid === props.selectedNoteId}
      />
    );
  };
  let placeholderText = '';
  if (props.decrypting) {
    placeholderText = 'Decrypting notes...';
  } else if (props.loading) {
    placeholderText = 'Loading notes...';
  } else if (props.notes.length === 0) {
    placeholderText = 'No notes.';
  }
  return (
    <Container>
      <HeaderContainer>
        <SearchBarContainer>
          {Platform.OS === 'ios' && (
            <IosSearchBar
              ref={iosSearchBarInputRef}
              keyboardAppearance={themeService?.keyboardColorForActiveTheme()}
              placeholder="Search"
              hideBackground
              /**
               * keyboardColorForActiveTheme returns the same value as apperance
               */
              appearance={themeService?.keyboardColorForActiveTheme()}
              barTintColor={theme.stylekitInfoColor}
              textFieldBackgroundColor={theme.stylekitContrastBackgroundColor}
              onChangeText={onChangeSearchText}
              onSearchButtonPress={() => {
                iosSearchBarInputRef.current?.blur();
              }}
              onCancelButtonPress={() => {
                iosSearchBarInputRef.current?.blur();
                props.onSearchCancel();
              }}
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
            />
          )}
          {Platform.OS === 'android' && (
            <AndroidSearchBar
              ref={androidSearchBarInputRef}
              onChangeText={onChangeSearchText}
              onCancel={() => {
                onSearchBlur();
                props.onSearchCancel();
              }}
              onDelete={props.onSearchCancel}
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
              collapseOnBlur={collapseSearchBarOnBlur}
              blurOnSubmit={true}
              backgroundColor={theme.stylekitBackgroundColor}
              titleCancelColor={theme.stylekitInfoColor}
              keyboardDismissMode={'interactive'}
              keyboardAppearance={themeService?.keyboardColorForActiveTheme()}
              inputBorderRadius={4}
              tintColorSearch={theme.stylekitForegroundColor}
              inputStyle={[
                styles.androidSearch,
                {
                  color: theme.stylekitForegroundColor,
                  backgroundColor: theme.stylekitContrastBackgroundColor,
                },
              ]}
              placeholderExpandedMargin={25}
              searchIconCollapsedMargin={30}
            />
          )}
        </SearchBarContainer>
        <SearchOptionsContainer
          as={Animated.ScrollView}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps={'always'}
          style={{
            opacity: opacityAnimationValue,
            marginTop: marginTopAnimationValue,
          }}
        >
          {props.searchOptions.map(({ selected, onPress, label }, index) => (
            <Chip
              key={label}
              selected={selected}
              onPress={onPress}
              label={label}
              last={index === props.searchOptions.length - 1}
            />
          ))}
        </SearchOptionsContainer>
      </HeaderContainer>
      <FlatList
        ref={noteListRef}
        style={styles.list}
        keyExtractor={item => item.uuid}
        contentContainerStyle={[
          { paddingBottom: insets.bottom },
          props.notes.length > 0 ? {} : { height: '100%' },
        ]}
        initialNumToRender={6}
        windowSize={6}
        maxToRenderPerBatch={6}
        ListEmptyComponent={() =>
          placeholderText.length > 0 ? (
            <LoadingContainer>
              <LoadingText>{placeholderText}</LoadingText>
            </LoadingContainer>
          ) : null
        }
        keyboardDismissMode={'interactive'}
        keyboardShouldPersistTaps={'never'}
        refreshControl={
          !props.hasRefreshControl ? undefined : (
            <RefreshControl
              tintColor={theme.stylekitContrastForegroundColor}
              refreshing={props.refreshing}
              onRefresh={props.onRefresh}
            />
          )
        }
        data={props.notes}
        renderItem={renderItem}
        extraData={signedIn}
        ListHeaderComponent={() => (
          <HeaderContainer>{!signedIn && <OfflineBanner />}</HeaderContainer>
        )}
        onScroll={onScroll}
      />
    </Container>
  );
};
