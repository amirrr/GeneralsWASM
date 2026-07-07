#ifndef OSDEP_H
#define OSDEP_H

#ifdef _UNIX
#include <alloca.h>
#define _alloca alloca
#include <ctype.h>
#include <cstring>
#include <wchar.h>
typedef char TCHAR;
typedef wchar_t WCHAR; 
#define _tcslen strlen
#define _tcsclen strlen
#define _tcscmp strcmp
#define _tcsicmp strcasecmp
#define _wcsicmp wcscasecmp 
#define stricmp strcasecmp
#define strnicmp strncasecmp
#define strcmpi strcasecmp

#define _vsnprintf vsnprintf
#define _snprintf snprintf
#define _strdup strdup      // GeneralsX @build BenderAI 10/02/2026 - String duplication
#define lstrcpy strcpy      // GeneralsX @build BenderAI 10/02/2026 - String copy
#define lstrcpyn strncpy    // GeneralsX @build BenderAI 10/02/2026 - String copy with length
#define lstrcat strcat      // GeneralsX @build BenderAI 10/02/2026 - String concatenation

// GeneralsX @bugfix GitHubCopilot 07/07/2026 Avoid header-level symbol conflicts on Emscripten by aliasing to local helpers
#if !defined(strupr)
static inline char *generalsx_strupr(char *str)
{
    for (int i = 0; i < strlen(str); i++)
        str[i] = toupper(str[i]);

    return str;
}
#define strupr generalsx_strupr
#endif

#if !defined(strrev)
static inline char *generalsx_strrev(char *str)
{
    if (!str || ! *str)
        return str;

    int i = strlen(str) - 1, j = 0;

    char ch;
    while (i > j)
    {
        ch = str[i];
        str[i] = str[j];
        str[j] = ch;
        i--;
        j++;
    }
    return str;
}
#define strrev generalsx_strrev
#endif

#endif // _UNIX

#endif // OSDEP_H
