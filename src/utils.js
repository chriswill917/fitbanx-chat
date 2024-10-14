const stringToColor = (string) => {
    let hash = 0;
    let i;

    /* eslint-disable no-bitwise */
    for (i = 0; i < string.length; i += 1) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }

    let color = '#';

    for (i = 0; i < 3; i += 1) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.substr(-2);
    }
    return color;
}

const stringAvatar = (name) => {
    const updateName = name.replace(/\s{2,}/g, ' ');
    let child = '';
    if(updateName) {
        const splitName = updateName.split(' ');
        if(splitName.length >= 2) {
            child = `${splitName[0][0]}${splitName[1][0]}`;
        } else {
            child = `${splitName[0][0].slice(0,2)}`
        }
    }
    const color = stringToColor(updateName);
    return {
        color: color,
        backgroundColor: color,
        children: child,
    };
}

const getBroadcastRecipientsLabel = (recipients) => {
    return recipients.reduce((acc, item, index, thisArr) => {
        acc.length >= 5 ? acc.push(`and ${thisArr.length - acc.length} others`) : acc.push(item.name);
        return acc;
      }, []).join(', ');
}

export {
    stringAvatar,
    stringToColor,
    getBroadcastRecipientsLabel
}
