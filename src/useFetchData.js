import { useRef, useState } from "react";
import db, { getFieldPath } from './firebase';



export default function useFetchData(limitNumber, get,initCount, clientIds, snapHandler, name) {
	const limit = useRef(0);
	const dataUnsub = useRef();
	const [data, setData] = useState(null);
	const snapCount = useRef(0);

    if(clientIds.length === 0) {
        return [data, function fetchData(setScrollFetch) {
            setData([]);
        }];
    }

	return [data, function fetchData(setScrollFetch, userList, isSearch, clientIds, initCount, offset) {
        if (limit.current || limit.current === 0) {
            if (dataUnsub.current) {
                dataUnsub.current();
            };
            if (initCount) {
                offset = 0;
            };
            let timeout = null;
            let clients = clientIds.map(c => c.fb_user_id);
            let pageClients = clients.slice(offset).slice(0, 10);
	        if (pageClients.length === 0) {
                return;
            }
            pageClients = pageClients.filter(p => typeof p !== 'undefined')
            let getNew = db.collection("users").
            where(getFieldPath.documentId(), "in", pageClients)
            const getData = getNew;
            dataUnsub.current = getData.onSnapshot(snapshot => {
                const s = () => {
                    let arr = snapHandler(snapshot);
                    arr = arr.filter((a) => {
                        const findIndex = clientIds.findIndex((clientId) => clientId.fb_user_id === a.userID);
                        return findIndex > -1;
                    })
                    arr = arr.map((a) => {
                        const findIndex = clientIds.findIndex((clientId) => clientId.fb_user_id === a.userID);
                        return {
                            ...a,
                            name: clientIds[findIndex]['name']
                        }
                    });
                  
                    let userArr;
                    if(!userList) {
                        userArr = [];
                    } else {
                        userArr = userList;
                    }
                    if (arr.length > 0) {
                        userArr = arr.sort((a,b)=> (a.name > b.name ? 1 : -1));
                        setData(userArr);
                    }
                };
                if (snapshot.docs?.length > 0) {
                    if (snapCount.current >= 2) {
                    	if (timeout) {
                    		clearTimeout(timeout);
                    		timeout = null;
                    	}
                    	s();
                    } else {
                    	timeout = setTimeout(s, 1500)
                    };
                } else if (snapshot.docs?.length === 0) {
                    setData([]);
                };
            });
        };
        return dataUnsub;
	}, setData];
};
