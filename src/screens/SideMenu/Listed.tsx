import { SnIcon } from '@Components/SnIcon';
import { ApplicationContext } from '@Root/ApplicationContext';
import {
  CantLoadActionsText,
  CreateBlogContainer,
  ListedItemRow,
  styles,
} from '@Screens/SideMenu/Listed.styled';
import { SideMenuCell } from '@Screens/SideMenu/SideMenuCell';
import { SideMenuOptionIconDescriptionType } from '@Screens/SideMenu/SideMenuSection';
import {
  ButtonType,
  ListedAccount,
  ListedAccountInfo,
  SNNote,
} from '@standardnotes/snjs';
import { useCustomActionSheet } from '@Style/custom_action_sheet';
import React, { FC, useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

type TProps = {
  note: SNNote;
};

type TListedAccountItem =
  | ListedAccountInfo
  | Pick<ListedAccountInfo, 'display_name'>;

export const Listed: FC<TProps> = ({ note }) => {
  const application = useContext(ApplicationContext);

  const [isLoading, setIsLoading] = useState(false);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [isRequestingAccount, setIsRequestingAccount] = useState(false);

  const [listedAccounts, setListedAccounts] = useState<ListedAccount[]>([]);
  const [listedAccountDetails, setListedAccountDetails] = useState<
    TListedAccountItem[]
  >([]);
  const [
    authorUrlWithInProgressAction,
    setAuthorUrlWithInProgressAction,
  ] = useState<string | null>(null);

  const { showActionSheet } = useCustomActionSheet();

  const getListedAccountsDetails = useCallback(
    async (accounts: ListedAccount[]) => {
      if (!application) {
        return;
      }
      const listedAccountsArray: TListedAccountItem[] = [];

      for (const listedAccountItem of accounts) {
        const listedItemInfo = await application.getListedAccountInfo(
          listedAccountItem,
          note?.uuid
        );

        listedAccountsArray.push(
          listedItemInfo
            ? listedItemInfo
            : { display_name: listedAccountItem.authorId }
        );
      }
      return listedAccountsArray;
    },
    [application, note?.uuid]
  );

  const reloadListedAccounts = useCallback(async () => {
    if (!application) {
      return [];
    }
    setIsLoading(true);
    const accounts = await application.getListedAccounts();
    setListedAccounts(accounts);

    setListedAccountDetails((await getListedAccountsDetails(accounts)) || []);
    setIsLoading(false);
  }, [application, getListedAccountsDetails]);

  const registerNewAccount = useCallback(() => {
    if (!application || isRequestingAccount) {
      return;
    }

    const requestAccount = async () => {
      setIsRequestingAccount(true);
      const account = await application.requestNewListedAccount();
      if (account) {
        const openSettings = await application.alertService.confirm(
          'Your new Listed blog has been successfully created!' +
            ' You can publish a new post to your blog from Standard Notes via the' +
            ' Actions menu in the editor pane. Open your blog settings to begin setting it up.',
          undefined,
          'Open Settings',
          ButtonType.Info,
          'Later'
        );
        reloadListedAccounts();

        if (openSettings) {
          const info = await application.getListedAccountInfo(account);
          if (info) {
            application.deviceInterface.openUrl(info?.settings_url);
          }
        }
      }
      setIsRequestingAccount(false);
    };

    requestAccount();
  }, [application, isRequestingAccount, reloadListedAccounts]);

  useEffect(() => {
    const loadListedData = async () => {
      await reloadListedAccounts();
    };
    loadListedData();
  }, [reloadListedAccounts]);

  const doesListedItemHaveActions = (
    item: TListedAccountItem
  ): item is ListedAccountInfo => {
    return (item as ListedAccountInfo).author_url !== undefined;
  };

  const showActionsMenu = (item: TListedAccountItem, index: number) => {
    if (!application) {
      return;
    }
    if (!doesListedItemHaveActions(item)) {
      application.alertService.alert('Unable to load actions.');
      return;
    }
    showActionSheet(
      item.display_name,
      item.actions.map(action => ({
        text: action.label,
        callback: async () => {
          setIsActionInProgress(true);
          setAuthorUrlWithInProgressAction(item.author_url);

          const response = await application.actionsManager.runAction(
            action,
            note
          );

          if (!response || response.error) {
            setIsActionInProgress(false);
            setAuthorUrlWithInProgressAction(null);
            return;
          }
          const listedDetails = (await getListedAccountsDetails(
            listedAccounts
          )) as TListedAccountItem[];
          setListedAccountDetails(listedDetails);

          showActionsMenu(listedDetails[index], index);
          setIsActionInProgress(false);
          setAuthorUrlWithInProgressAction(null);
        },
      }))
    );
  };

  if (!application) {
    return null;
  }
  return (
    <View>
      {isLoading && <ActivityIndicator style={styles.loadingIndicator} />}
      {listedAccountDetails.length > 0 && (
        <FlatList
          data={listedAccountDetails}
          renderItem={({ item, index }) => {
            if (!item) {
              return null;
            }
            return (
              <View>
                <ListedItemRow>
                  <SideMenuCell
                    text={item.display_name}
                    onSelect={() => showActionsMenu(item, index)}
                    iconDesc={{
                      side: 'left',
                      type: SideMenuOptionIconDescriptionType.CustomComponent,
                      value: (
                        <SnIcon type={'notes'} styles={styles.blogItemIcon} />
                      ),
                    }}
                  />
                  {isActionInProgress &&
                    (item as ListedAccountInfo).author_url ===
                      authorUrlWithInProgressAction && (
                      <ActivityIndicator
                        style={styles.blogActionInProgressIndicator}
                      />
                    )}
                </ListedItemRow>
                {!isLoading && !doesListedItemHaveActions(item) && (
                  <CantLoadActionsText>
                    Unable to load actions
                  </CantLoadActionsText>
                )}
              </View>
            );
          }}
        />
      )}
      <CreateBlogContainer>
        <ListedItemRow>
          <SideMenuCell
            text={
              isRequestingAccount ? 'Creating account...' : 'Create New Author'
            }
            onSelect={registerNewAccount}
            iconDesc={{
              side: 'left',
              type: SideMenuOptionIconDescriptionType.CustomComponent,
              value: <SnIcon type={'user-add'} styles={styles.blogItemIcon} />,
            }}
          />
          {isRequestingAccount && (
            <ActivityIndicator style={styles.blogActionInProgressIndicator} />
          )}
        </ListedItemRow>
        <ListedItemRow>
          <SideMenuCell
            text={'Learn more'}
            onSelect={() =>
              application.deviceInterface.openUrl('https://listed.to')
            }
            iconDesc={{
              side: 'left',
              type: SideMenuOptionIconDescriptionType.CustomComponent,
              value: <SnIcon type={'open-in'} styles={styles.blogItemIcon} />,
            }}
          />
        </ListedItemRow>
      </CreateBlogContainer>
    </View>
  );
};
